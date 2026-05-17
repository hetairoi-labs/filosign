#!/usr/bin/env bun
import { shutdownPostHog } from "@/lib/analytics/posthog";
import { runExpireColdInvitesJob } from "@/lib/jobs/expire-cold-invites";

const result = await runExpireColdInvitesJob();
console.log(`Expired ${result.expiredCount} cold invite(s)`);
await shutdownPostHog();
