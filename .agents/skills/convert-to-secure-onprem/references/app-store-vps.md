# App Store and VPS delivery

## Shared release contract

- Build mobile and server artifacts from one protected SemVer tag.
- Record source commit, API schema/version, image digest, mobile build number,
  bundle ID and SBOM/provenance identities in the release manifest.
- Define `minClientVersion`, `minApiVersion` and a backward-compatibility window.
- Deploy additive/backward-compatible API changes before submitting the app.
- Separate Apple signing credentials, VPS deploy credentials, license signing
  keys and production application secrets.

## Apple App Store / TestFlight

### Discovery

1. Identify iOS Capacitor/native and macOS Tauri/native targets separately.
2. Read bundle IDs, marketing/build versions, deployment targets, entitlements,
   privacy usage strings, privacy manifests, universal links and push/IAP setup.
3. Identify the Apple Developer team, App Store Connect application record,
   signing method and whether the release uses subscriptions or other digital
   purchases.

### Pipeline

1. Build and test the web/native client with production API configuration.
2. Sync generated web assets into the native project deterministically.
3. Run unit tests plus an iOS Simulator smoke test where feasible.
4. Archive on a controlled current macOS/Xcode runner.
5. Export for App Store Connect with distribution signing; never store a
   certificate password or App Store Connect private key in the repository.
6. Validate the archive, upload to App Store Connect and release to TestFlight
   internal testers before external review or production rollout.
7. Complete App Privacy, age rating, encryption/export compliance, screenshots,
   review notes, support/privacy URLs, account-deletion instructions and IAP
   review metadata.
8. Verify sign-in, deep links, push notifications, camera/microphone permissions,
   offline behavior, purchase, restore purchase and server-side notification
   handling on a physical device.

### Gates

- Bundle ID, team, entitlements and App Store Connect record agree.
- Marketing version is SemVer-compatible and build number only increases.
- Production app contains no development API URL, signing secret or server key.
- Required privacy manifests and usage descriptions match runtime behavior.
- Digital subscriptions use StoreKit and server verification; restore works.
- A reviewer can sign in using a supplied review account when authentication is
  required.
- The server supports both the currently published app and the candidate app.

App Store rollback means stopping/phasing a release and submitting a corrected
build; it is not equivalent to instant server rollback. Preserve compatibility
and use server-side feature flags for risky features.

## VPS

### Baseline topology

```text
Internet -> 443 reverse proxy -> application container -> private PostgreSQL
                                      |-> private Redis/object storage (optional)
```

- Publish only TCP 22 from an administration allowlist and TCP 80/443 for the
  reverse proxy. Do not publish PostgreSQL, Redis or application debug ports.
- Run the application as non-root with dropped capabilities and read-only
  configuration. Mount explicit durable data and backup paths.
- Terminate TLS at Caddy, Nginx, Traefik or a managed load balancer. Automate
  certificate renewal and monitor expiry.

### Pipeline

1. Provision a dedicated deploy account and host keys; disable password/root SSH.
2. Install a supported container runtime and configure log rotation, time sync,
   firewall, security updates and disk alerts.
3. Pull the approved image by digest using a read-only registry credential, or
   verify and import the signed air-gap bundle.
4. Verify signature, provenance, SBOM policy, release manifest and license.
5. Validate free disk, configuration, database connectivity and backup target.
6. Create and verify a pre-deploy database plus file backup.
7. Apply ordered checksummed migrations under a lock.
8. Start the candidate, wait with a bounded timeout, run readiness and external
   HTTPS smoke tests, then switch traffic.
9. Return to the previous digest/configuration on failure. Restore data only when
   the migration contract explicitly declares downgrade unsafe and the restore
   procedure has been validated.

### Gates

- DNS and valid TLS chain are verified from outside the VPS.
- Only approved ports are reachable.
- Deployment uses an immutable digest and a least-privilege account.
- Database is private and backups are encrypted off-host with retention policy.
- Readiness checks include a representative database query.
- Restore drill, RPO/RTO and rollback drill have recorded evidence.
- Monitoring covers uptime, HTTP 5xx, CPU, memory, disk, certificate expiry,
  backup age and database health.

## AeroEduVision defaults

- iOS client: Capacitor project under `aeroedu-vite/ios`, bundle
  `com.aeroedu.inphysic` unless the native project proves otherwise.
- Server: `Dockerfile.onprem` plus `docker-compose.onprem.yml`.
- Database: local/private PostgreSQL because production queries are
  PostgreSQL-specific.
- Release order: VPS API first with backward compatibility, TestFlight second,
  phased App Store release last.
