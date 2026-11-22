# Whyscape publisher image — Cloud Run Job (job.js) and the private OAuth service (oauth_server.js). Build from the repo root:
#   gcloud builds submit --tag <REGION>-docker.pkg.dev/<PROJECT>/whyscape/publisher:<tag> -f automation/publisher/cloud/Dockerfile .
# No credentials are baked in: secrets are mounted by Cloud Run from Secret Manager at /secrets/<name>/value.
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY automation/format_rules.js automation/format_rules.js
COPY automation/publisher/core.js automation/publisher/youtube.js automation/publisher/facebook.js automation/publisher/instagram.js automation/publisher/
COPY automation/publisher/cloud/*.js automation/publisher/cloud/
USER node
ENV NODE_ENV=production
ENTRYPOINT ["node"]
CMD ["automation/publisher/cloud/job.js", "tick"]
