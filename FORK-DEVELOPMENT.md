# Fork Development Workflow

Guide for building this react-notion-x fork and publishing via GitHub Releases to `Dynogic/react-notion-x`.

## Prerequisites

- Node.js >= 20
- pnpm 10.32.1+
- GitHub CLI (`brew install gh`)

## Versioning Scheme

The fork uses a 4-segment version: `v<upstream-version>.<fork-patch>`

- Upstream `7.10.0` -> fork releases `v7.10.0.1`, `v7.10.0.2`, ...
- When upstream bumps (e.g. `7.10.0` -> `7.11.0`), reset fork patch to `.1` -> `v7.11.0.1`

## Packages We Fork

Only these packages are modified and published:

- `notion-client` — proxy support, retry/backoff on 429
- `notion-utils` — (upstream sync only for now)

The consuming project (`varig`) installs these from GitHub Releases.

## Release Workflow

### Step 1: Determine the next version

```bash
LATEST=$(gh release list --repo Dynogic/react-notion-x --limit 1 --json tagName --jq '.[0].tagName')
echo "Latest: $LATEST"

NEXT=$(echo "$LATEST" | sed 's/v//' | awk -F. '{$NF=$NF+1; print "v"$0}' OFS=.)
echo "Next:   $NEXT"
```

> If this is the first release, set `NEXT=v7.10.0.1` manually.

### Step 2: Build

```bash
pnpm install
pnpm build
```

### Step 3: Pack

```bash
mkdir -p packed
cd packages/notion-client && pnpm pack --pack-destination ../../packed && cd ../..
cd packages/notion-utils && pnpm pack --pack-destination ../../packed && cd ../..
```

### Step 4: Create the GitHub release

```bash
gh release create "$NEXT" ./packed/*.tgz \
  --title "$NEXT" \
  --notes "Description of changes" \
  --repo Dynogic/react-notion-x
```

### Step 5: Update the consuming project

Update `varig/server/import/package.json` and `varig/package.json` to point to the new release tarballs:

```json
"notion-client": "https://github.com/Dynogic/react-notion-x/releases/download/v7.10.0.1/notion-client-7.10.0.tgz",
"notion-utils": "https://github.com/Dynogic/react-notion-x/releases/download/v7.10.0.1/notion-utils-7.10.0.tgz"
```

Then reinstall dependencies in both locations.

## Other Operations

### Sync with upstream

```bash
git fetch upstream
git merge upstream/master
# Resolve conflicts, then follow the Release Workflow above
```

### View releases

```bash
gh release list --repo Dynogic/react-notion-x
```
