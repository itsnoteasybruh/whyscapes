# Whyscape publisher image — Cloud Run Job (job.js) and the private OAuth service (oauth_server.js). Build from the repo root:
#   built by deploy.sh (phase build) from a minimal temporary context that contains only these files + this Dockerfile at its root
# No credentials are baked in: the job reads Secret Manager through its API at runtime (runs as non-root "node").
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY automation/format_rules.js automation/format_rules.js
COPY automation/publisher/core.js automation/publisher/youtube.js automation/publisher/facebook.js automation/publisher/instagram.js automation/publisher/
COPY automation/publisher/cloud/gcp.js automation/publisher/cloud/state.js automation/publisher/cloud/planner.js automation/publisher/cloud/support.js automation/publisher/cloud/tasks.js automation/publisher/cloud/job.js automation/publisher/cloud/oauth_server.js automation/publisher/cloud/
USER node
ENV NODE_ENV=production
ENTRYPOINT ["node"]
CMD ["automation/publisher/cloud/job.js", "tick"]
