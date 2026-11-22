#!/usr/bin/env bash
# Whyscape publisher — one-time Google Cloud setup. WRITTEN, NOT RUN: review and run it yourself (or ask Claude to, explicitly)
# after the setup checklist in README_CLOUD.md. It creates NO schedule for content: Scheduler only wakes the job, and the job acts
# solely on episodes that carry a creator approval.json in the bucket. Nothing here reads, prints or stores a secret VALUE.
set -euo pipefail
: "${PROJECT:?set PROJECT}"; REGION="${REGION:-asia-southeast2}"; BUCKET="${BUCKET:-${PROJECT}-whyscape-publisher}"
SA="whyscape-publisher@${PROJECT}.iam.gserviceaccount.com"; SCHED_SA="whyscape-scheduler@${PROJECT}.iam.gserviceaccount.com"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/whyscape/publisher:${TAG:-v1}"
gcloud config set project "$PROJECT"
gcloud services enable run.googleapis.com cloudscheduler.googleapis.com secretmanager.googleapis.com storage.googleapis.com \
  iamcredentials.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com youtube.googleapis.com logging.googleapis.com monitoring.googleapis.com
# identities: the job's SA (bucket objects, secrets, sign its own URLs) and a separate SA that may only start the job
gcloud iam service-accounts create whyscape-publisher --display-name "Whyscape publisher job" || true
gcloud iam service-accounts create whyscape-scheduler --display-name "Whyscape scheduler trigger" || true
gcloud iam service-accounts add-iam-policy-binding "$SA" --member "serviceAccount:$SA" --role roles/iam.serviceAccountTokenCreator   # signBlob for V4 URLs, no key file
# private bucket (uniform access, no public access), short lifecycle for derived files
gcloud storage buckets create "gs://$BUCKET" --location "$REGION" --uniform-bucket-level-access --public-access-prevention || true
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --member "serviceAccount:$SA" --role roles/storage.objectUser
# secrets: created EMPTY here; values are added by you (Console or `gcloud secrets versions add ... --data-file=-` typed locally)
for s in meta-token yt-oauth-client yt-refresh-token; do
  gcloud secrets create "$s" --replication-policy automatic || true
  gcloud secrets add-iam-policy-binding "$s" --member "serviceAccount:$SA" --role roles/secretmanager.secretAccessor
done
gcloud secrets add-iam-policy-binding yt-refresh-token --member "serviceAccount:$SA" --role roles/secretmanager.secretVersionAdder   # OAuth service writes new versions
# image
gcloud artifacts repositories create whyscape --repository-format docker --location "$REGION" || true
gcloud builds submit --tag "$IMAGE" -f automation/publisher/cloud/Dockerfile .
# the job: no task retries (idempotency + alerts instead), 1 vCPU / 1 GiB, 30 min timeout, secrets as volumes (latest version)
gcloud run jobs deploy whyscape-publisher --image "$IMAGE" --region "$REGION" --service-account "$SA" --max-retries 0 --task-timeout 30m \
  --cpu 1 --memory 1Gi --set-env-vars "WHYSCAPE_BUCKET=$BUCKET,GCP_PROJECT=$PROJECT" \
  --set-secrets "/secrets/meta-token/value=meta-token:latest,/secrets/yt-oauth-client/value=yt-oauth-client:latest,/secrets/yt-refresh-token/value=yt-refresh-token:latest"
# private OAuth service (no public access; open it with `gcloud run services proxy whyscape-oauth --region $REGION --port 8080`)
gcloud run deploy whyscape-oauth --image "$IMAGE" --region "$REGION" --service-account "$SA" --no-allow-unauthenticated --max-instances 1 \
  --command node --args automation/publisher/cloud/oauth_server.js --set-env-vars "GCP_PROJECT=$PROJECT,REDIRECT_URI=http://localhost:8080/callback" \
  --set-secrets "/secrets/yt-oauth-client/value=yt-oauth-client:latest"
# triggers: Scheduler may only RUN the job (roles/run.invoker on the job), Asia/Jakarta wall clock (no DST in Indonesia)
gcloud run jobs add-iam-policy-binding whyscape-publisher --region "$REGION" --member "serviceAccount:$SCHED_SA" --role roles/run.invoker
RUN_URI="https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/jobs/whyscape-publisher:run"
mk() { gcloud scheduler jobs create http "$1" --location "$REGION" --schedule "$2" --time-zone "Asia/Jakarta" --uri "$RUN_URI" --http-method POST \
  --oauth-service-account-email "$SCHED_SA" --headers "Content-Type=application/json" --message-body "{\"overrides\":{\"containerOverrides\":[{\"args\":[\"automation/publisher/cloud/job.js\",\"$3\"]}]}}" || true; }
mk whyscape-tick           "*/30 * * * *"   tick             # early YouTube upload, Facebook schedule, Instagram prepare, verify
mk whyscape-publish-window "*/5 20-22 * * *" publish-window  # Instagram media_publish inside [publish_at, +20 min]
mk whyscape-report         "30 21 * * *"    report           # post-21:00 read-back + report + alerts
# monitoring: log-based metric on alert lines + failed executions; create the alert policy + email channel in the Console
gcloud logging metrics create whyscape_alerts --description "Whyscape publisher alerts" \
  --log-filter 'resource.type="cloud_run_job" AND resource.labels.job_name="whyscape-publisher" AND severity>=ERROR' || true
echo "Done. Next: add secret VALUES yourself, run the OAuth service once, upload an approved package. Nothing was scheduled."
