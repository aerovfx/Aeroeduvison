# Security and release gates

## Block release on

- source, `.env`, credentials or private keys in the image/build context;
- mutable deployment tags or unpinned CI actions;
- scan/sign occurring before candidate validation;
- signing secrets available to pull-request code;
- license claims that are validated but not enforced;
- missing migration path for an existing installation;
- destructive restore without validation, safety backup and failure recovery;
- deploy without bounded readiness and rollback;
- air-gap archive whose trust key travels only inside the same archive;
- release without recent approved DR evidence and a signed release manifest;
- claims of source encryption based solely on minification.
- App Store archive containing development endpoints, private keys or server
  credentials;
- mobile release without a compatible deployed API version;
- VPS deployment by mutable tag, root login, public database port or without a
  verified pre-deploy backup.

## App Store baseline

- bundle ID, team, entitlement and App Store Connect record consistency;
- monotonically increasing build number;
- privacy manifests/usage strings match accessed APIs;
- StoreKit plus server verification for digital purchases;
- physical-device and TestFlight smoke tests;
- review account and account-deletion path when required;
- backward-compatible production API before submission.

## VPS baseline

- SSH keys, non-root deploy account and administration allowlist;
- only 80/443 publicly exposed, plus restricted SSH;
- TLS renewal and expiry monitoring;
- immutable digest plus signature/provenance verification;
- off-host encrypted backup and restore evidence;
- bounded readiness, external smoke test and automatic rollback.

## Container baseline

- non-root user;
- no unnecessary capabilities;
- `no-new-privileges`;
- loopback bind by default;
- database private network only;
- persistent paths explicit;
- PID/resource/log limits;
- healthcheck tests a representative schema query;
- base and helper images approved and pinned for release.

## CI baseline

- full-SHA action pins;
- least-privilege job permissions;
- protected release environment;
- immutable semantic release identity;
- candidate scan before registry promotion/signing;
- exact digest signature;
- SBOM/provenance verification at deploy;
- no customer source checkout on persistent on-prem runners.

## Backup baseline

- database and application files included;
- temporary output validated before atomic rename;
- checksums and version/digest manifest;
- restore input checked before mutation;
- automatic pre-restore safety backup;
- transactional or staging restore;
- scheduled restore drill.
