#!/usr/bin/env bash
# Whyscape publisher — Google Cloud setup in separate phases. NOTHING runs by default: `./deploy.sh plan` only prints the actions.
# Each phase is run explicitly by the creator (or by Claude only on the creator's explicit instruction):
#   PROJECT=<id> ./deploy.sh plan | infra | build | deploy-oauth | deploy-job | schedulers | monitoring | status
#   PROJECT=<id> ./deploy.sh enable-schedulers     ← only when credentials, media and approvals are ready (creator decision)
# Content is never scheduled by this script: the job acts only on episodes with a creator approval.json in the bucket.
# No secret VALUE is read, printed or stored here; secrets are created empty and filled by the creator.
set -euo pipefail
PHASE="${1:-plan}"
: "${PROJECT:?set PROJECT=<gcp-project-id>}"
REGION="${REGION:-asia-southeast2}"                     # Jakarta: Cloud Run, Cloud Scheduler and Cloud Tasks are available there
BUCKET="${BUCKET:-${PROJECT}-whyscape-publisher}"
TAG="${TAG:-v1}"; IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/whyscape/publisher:${TAG}"
JOB=whyscape-publisher; QUEUE=whyscape-triggers; OAUTH_SVC=whyscape-oauth
JOB_SA="whyscape-publisher@${PROJECT}.iam.gserviceaccount.com"      # runs the job: bucket, read secrets, sign URLs, enqueue tasks
OAUTH_SA="whyscape-oauth@${PROJECT}.iam.gserviceaccount.com"        # runs the OAuth service: read client JSON, ADD refresh-token versions
TRIG_SA="whyscape-trigger@${PROJECT}.iam.gserviceaccount.com"       # identity of Scheduler + Tasks calls: may only run the job with overrides
SECRETS=(meta-token yt-oauth-client yt-refresh-token)

say() { printf '\n== %s\n' "$*"; }
run() { if [ "$PHASE" = plan ]; then printf '   %s\n' "$*"; else "$@"; fi; }
exists() { [ "$PHASE" = plan ] && return 1; "$@" >/dev/null 2>&1; }
pnum() { gcloud projects describe "$PROJECT" --format='value(projectNumber)'; }

phase_infra() {
  say "infra: APIs"
  run gcloud services enable run.googleapis.com cloudscheduler.googleapis.com cloudtasks.googleapis.com secretmanager.googleapis.com storage.googleapis.com \
    iamcredentials.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com youtube.googleapis.com logging.googleapis.com monitoring.googleapis.com --project "$PROJECT"
  say "infra: service accounts (3, least privilege)"
  for sa in whyscape-publisher whyscape-oauth whyscape-trigger; do
    exists gcloud iam service-accounts describe "${sa}@${PROJECT}.iam.gserviceaccount.com" --project "$PROJECT" || run gcloud iam service-accounts create "$sa" --project "$PROJECT" --display-name "Whyscape $sa"
  done
  run gcloud iam service-accounts add-iam-policy-binding "$JOB_SA" --project "$PROJECT" --member "serviceAccount:$JOB_SA" --role roles/iam.serviceAccountTokenCreator   # signBlob for V4 URLs (own key, no file)
  run gcloud iam service-accounts add-iam-policy-binding "$TRIG_SA" --project "$PROJECT" --member "serviceAccount:$JOB_SA" --role roles/iam.serviceAccountUser          # job may attach TRIG_SA to the tasks it creates
  say "infra: private bucket (uniform access, public access prevention)"
  exists gcloud storage buckets describe "gs://$BUCKET" || run gcloud storage buckets create "gs://$BUCKET" --project "$PROJECT" --location "$REGION" --uniform-bucket-level-access --public-access-prevention
  run gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" --member "serviceAccount:$JOB_SA" --role roles/storage.objectUser
  say "infra: secrets created EMPTY (values are added by the creator, never by this script)"
  for s in "${SECRETS[@]}"; do exists gcloud secrets describe "$s" --project "$PROJECT" || run gcloud secrets create "$s" --project "$PROJECT" --replication-policy automatic; done
  for s in "${SECRETS[@]}"; do run gcloud secrets add-iam-policy-binding "$s" --project "$PROJECT" --member "serviceAccount:$JOB_SA" --role roles/secretmanager.secretAccessor; done
  run gcloud secrets add-iam-policy-binding yt-oauth-client --project "$PROJECT" --member "serviceAccount:$OAUTH_SA" --role roles/secretmanager.secretAccessor
  run gcloud secrets add-iam-policy-binding yt-refresh-token --project "$PROJECT" --member "serviceAccount:$OAUTH_SA" --role roles/secretmanager.secretVersionAdder
  say "infra: Artifact Registry + Cloud Tasks queue (one-shot Instagram publish + post-publish verify triggers)"
  exists gcloud artifacts repositories describe whyscape --location "$REGION" --project "$PROJECT" || run gcloud artifacts repositories create whyscape --project "$PROJECT" --repository-format docker --location "$REGION"
  exists gcloud tasks queues describe "$QUEUE" --location "$REGION" --project "$PROJECT" || run gcloud tasks queues create "$QUEUE" --project "$PROJECT" --location "$REGION" --max-attempts 3 --min-backoff 60s
  run gcloud tasks queues add-iam-policy-binding "$QUEUE" --project "$PROJECT" --location "$REGION" --member "serviceAccount:$JOB_SA" --role roles/cloudtasks.enqueuer
  [ "$PHASE" = plan ] && N='<PROJECT_NUMBER>' || N="$(pnum)"
  run gcloud iam service-accounts add-iam-policy-binding "$TRIG_SA" --project "$PROJECT" --member "serviceAccount:service-${N}@gcp-sa-cloudtasks.iam.gserviceaccount.com" --role roles/iam.serviceAccountUser
}
phase_build() {
  say "build: minimal context (only the publisher code; no media, no .git, no secrets) → Cloud Build → Artifact Registry"
  if [ "$PHASE" = plan ]; then CTX='<tmp>'; else CTX="$(mktemp -d)"; fi
  run mkdir -p "$CTX/automation/publisher/cloud"
  run cp automation/format_rules.js "$CTX/automation/"
  run cp automation/publisher/core.js automation/publisher/youtube.js automation/publisher/facebook.js automation/publisher/instagram.js "$CTX/automation/publisher/"
  run cp automation/publisher/cloud/gcp.js automation/publisher/cloud/state.js automation/publisher/cloud/planner.js automation/publisher/cloud/support.js automation/publisher/cloud/tasks.js automation/publisher/cloud/job.js automation/publisher/cloud/oauth_server.js automation/publisher/cloud/Dockerfile "$CTX/automation/publisher/cloud/"
  run cp automation/publisher/cloud/Dockerfile "$CTX/Dockerfile"
  run gcloud builds submit "$CTX" --project "$PROJECT" --region "$REGION" --tag "$IMAGE"
}
phase_deploy_oauth() {
  say "deploy-oauth: private Cloud Run service (no public access, 1 instance), opened only via: gcloud run services proxy $OAUTH_SVC --region $REGION --port 8080"
  run gcloud run deploy "$OAUTH_SVC" --project "$PROJECT" --region "$REGION" --image "$IMAGE" --service-account "$OAUTH_SA" --no-allow-unauthenticated \
    --max-instances 1 --command node --args automation/publisher/cloud/oauth_server.js \
    --set-env-vars "GCP_PROJECT=$PROJECT,REDIRECT_URI=http://localhost:8080/callback"
}
phase_deploy_job() {
  say "deploy-job: Cloud Run Job, no task retries (idempotent state + alerts), 1 vCPU / 1 GiB, 30 min; secrets read via API at runtime"
  run gcloud run jobs deploy "$JOB" --project "$PROJECT" --region "$REGION" --image "$IMAGE" --service-account "$JOB_SA" --max-retries 0 --task-timeout 30m \
    --cpu 1 --memory 1Gi \
    --set-env-vars "WHYSCAPE_BUCKET=$BUCKET,GCP_PROJECT=$PROJECT,GCP_REGION=$REGION,TASKS_QUEUE=$QUEUE,JOB_NAME=$JOB,TRIGGER_SA=$TRIG_SA"
  run gcloud run jobs add-iam-policy-binding "$JOB" --project "$PROJECT" --region "$REGION" --member "serviceAccount:$TRIG_SA" --role roles/run.jobsExecutorWithOverrides
}
sched_body() { printf '{"overrides":{"containerOverrides":[{"args":["automation/publisher/cloud/job.js","%s"]}]}}' "$1"; }
phase_schedulers() {
  say "schedulers: created, then PAUSED immediately (gcloud has no create-paused flag); they stay paused until 'enable-schedulers'"
  RUN_URI="https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/jobs/${JOB}:run"
  for spec in "whyscape-tick|*/30 * * * *|tick" "whyscape-daily-report|55 23 * * *|report"; do
    IFS='|' read -r name cron mode <<<"$spec"
    if ! exists gcloud scheduler jobs describe "$name" --location "$REGION" --project "$PROJECT"; then
      run gcloud scheduler jobs create http "$name" --project "$PROJECT" --location "$REGION" --schedule "$cron" --time-zone "Asia/Jakarta" \
        --uri "$RUN_URI" --http-method POST --oauth-service-account-email "$TRIG_SA" --headers "Content-Type=application/json" --message-body "$(sched_body "$mode")"
    fi
    run gcloud scheduler jobs pause "$name" --project "$PROJECT" --location "$REGION"
  done
}
phase_enable() {
  say "enable-schedulers: resume tick + daily report (creator decision: credentials, media and approvals ready)"
  for name in whyscape-tick whyscape-daily-report; do run gcloud scheduler jobs resume "$name" --project "$PROJECT" --location "$REGION"; done
}
phase_monitoring() {
  say "monitoring: log-based metric on alert lines (alert policy + email channel are created in the Console)"
  exists gcloud logging metrics describe whyscape_alerts --project "$PROJECT" || run gcloud logging metrics create whyscape_alerts --project "$PROJECT" --description "Whyscape publisher alerts" \
    --log-filter "resource.type=\"cloud_run_job\" AND resource.labels.job_name=\"$JOB\" AND severity>=ERROR"
}
phase_status() {
  for name in whyscape-tick whyscape-daily-report; do gcloud scheduler jobs describe "$name" --location "$REGION" --project "$PROJECT" --format='value(name,state,schedule,timeZone)' || true; done
  for s in "${SECRETS[@]}"; do printf '%s versions: ' "$s"; gcloud secrets versions list "$s" --project "$PROJECT" --filter=state=ENABLED --format='value(name)' | wc -l; done
}

case "$PHASE" in
  plan) for f in phase_infra phase_build phase_deploy_oauth phase_deploy_job phase_schedulers phase_monitoring; do $f; done
        say "(enable-schedulers is a separate command, only on the creator's decision)"; phase_enable ;;
  infra) phase_infra ;; build) phase_build ;; deploy-oauth) phase_deploy_oauth ;; deploy-job) phase_deploy_job ;;
  schedulers) phase_schedulers ;; monitoring) phase_monitoring ;; status) phase_status ;; enable-schedulers) phase_enable ;;
  *) echo "unknown phase $PHASE"; exit 2 ;;
esac
