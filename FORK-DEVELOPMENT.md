# Fork Development Workflow

Guide for building this react-notion-x fork and publishing via GitHub Releases to `Dynogic/react-notion-x`.

## Prerequisites

- Node.js >= 20
- pnpm — the version pinned in the root `package.json` `packageManager` field (Corepack fetches it)
- GitHub CLI (`brew install gh`)

## Versioning Scheme

The fork uses a 4-segment version: `v<upstream-version>.<fork-patch>`

- Upstream `8.0.8` -> fork releases `v8.0.8.1`, `v8.0.8.2`, ...
- When upstream bumps (e.g. `8.0.8` -> `8.1.0`), reset fork patch to `.1` -> `v8.1.0.1`

## Packages We Fork

Only these packages are modified and published:

- `notion-client` — `requestFn` transport hook, `getOfetchOptions`, optional logger (see `FORK-CHANGES.md`)
- `notion-utils` — `getAllPagesInSpace` logger, `onPageFetched`, root-page error propagation, rows of grouped views and boards

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

Update `varig/server/media/package.json` and `varig/package.json` to point to the new release tarballs:

```json
"notion-client": "https://github.com/Dynogic/react-notion-x/releases/download/v8.0.8.1/notion-client-8.0.8.tgz",
"notion-utils": "https://github.com/Dynogic/react-notion-x/releases/download/v8.0.8.1/notion-utils-8.0.8.tgz"
```

Then reinstall dependencies in both locations. Keep varig's npm `react-notion-x` (the renderer, not forked) on the SAME upstream version, so it shares one `notion-utils`/`notion-types` copy with the fork.

## Other Operations

### Sync with upstream

```bash
git fetch upstream
git merge upstream/master
# Resolve conflicts (keep every FORK-CHANGES.md entry intact), add a row to
# FORK-CHANGES.md → Upstream sync log, then follow the Release Workflow above
```

### View releases

```bash
gh release list --repo Dynogic/react-notion-x
```
