# Sources

Status: `todo` — not used yet, `NNN` — used in episode NNN, `skip` — not load-shaped (reason).

## Where to look for new incidents

- AWS Post-Event Summaries — https://aws.amazon.com/premiumsupport/technology/pes/
- danluu/post-mortems — https://github.com/danluu/post-mortems
- Cloudflare post-mortems — https://blog.cloudflare.com/tag/post-mortem/
- GitHub Availability Reports — https://github.blog/tag/github-availability-report/
- Google Cloud incident history — https://status.cloud.google.com/summary
- Alibaba Cloud status and announcements — https://status.alibabacloud.com/

## Incidents

| Status | Incident | Source | Mechanism |
|--------|----------|--------|-----------|
| 001 | AWS Kinesis, us-east-1, 2020-11-25 | https://aws.amazon.com/message/11201/ | OS thread limit after front-end fleet capacity increase, cascade to Cognito/CloudWatch |
| todo | AWS us-east-1 internal network, 2021-12-07 | https://aws.amazon.com/message/12721/ | Client retry surge congesting internal network devices |
| todo | Cloudflare, 2019-07-02 | https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/ | Regex backtracking exhausting CPU across the edge |
