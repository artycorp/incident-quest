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

Ordered simplest first: one mechanism, 1–3 components, a short postmortem.

| Status | Incident | Source | Mechanism |
|--------|----------|--------|-----------|
| 001 | AWS Kinesis, us-east-1, 2020-11-25 | https://aws.amazon.com/message/11201/ | OS thread limit after front-end fleet capacity increase, cascade to Cognito/CloudWatch |
| todo | Stack Exchange, 2016-07-20 | http://web.archive.org/web/20160720200842/https://stackstatus.net/post/147710624694/outage-postmortem-july-20-2016 | One post makes a regex burn CPU on every home page view; the LB health check hits the home page and pulls all web servers |
| todo | Buildkite, 2016-08-23 | https://building.buildkite.com/outage-post-mortem-for-august-23rd-82b619a3679b | Database instance downgraded to cut AWS spend, not enough capacity at peak, dependent servers collapse |
| todo | GitHub, 2026-02-09 | https://github.blog/news-insights/company-news/addressing-githubs-recent-availability-issues-2/ | Client apps grow reads 10×, a cache TTL cut from 12h to 2h adds writes; Monday peak overloads the auth database |
| todo | Discord, 2017-03-20 | https://status.discordapp.com/incidents/dj3l6lw926kl | Flapping presence service, thundering herd on reconnect, frontend queues fill up memory |
| todo | Duo, 2018-08-20/29 | https://status.duo.com/incidents/4w07bmvnt359 | Request queue overloads insufficient database capacity, cascading latency and timeouts |
| todo | Stack Exchange, 2015-03-31 | http://web.archive.org/web/20150404235419/https://stackstatus.net/post/115305251014/outage-postmortem-march-31-2015 | April Fools' StackEgg enabled for all users, its polling overloads the load balancers |
| todo | Cloudflare, 2019-07-02 | https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/ | Regex backtracking exhausting CPU across the edge |
| todo | AWS us-east-1 internal network, 2021-12-07 | https://aws.amazon.com/message/12721/ | Client retry surge congesting internal network devices |
