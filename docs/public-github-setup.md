# Public GitHub setup (maintainers)

## Live

- **[`fampep/anikitty-extensions`](https://github.com/fampep/anikitty-extensions)** is **public**
- Store index: https://raw.githubusercontent.com/fampep/anikitty-extensions/main/store/index.json
- Android prefers that URL in `ExtensionStoreClient.DEFAULT_INDEX_URLS` (monorepo fallback retained)

Cloud agent tokens still cannot always `createRepository` / flip visibility — use the **fampep** GitHub user (or a self-hosted worker with fampep credentials) for those ops.

## 1. Make the app repo public (optional community surface)

```bash
gh repo edit fampep/anikitty --visibility public --accept-visibility-change-consequences
```

## 2. Refresh `fampep/anikitty-extensions` after monorepo `extensions/` changes

Cloud / Cursor tokens **cannot** push `fampep/anikitty-extensions` (no write).
Run this as **fampep** (laptop or self-hosted worker) after merging store/provider updates:

```bash
# from anikitty repo root (on main, clean tree)
./extensions/scripts/publish-to-github.sh
# equivalent:
#   git subtree split -P extensions -b extensions-publish
#   git push https://github.com/fampep/anikitty-extensions.git extensions-publish:main
```

Confirm raw store index loads and includes **Gotaku** + updated Anikoto copy:

`https://raw.githubusercontent.com/fampep/anikitty-extensions/main/store/index.json`

Until that mirror is refreshed, the APK prefers the monorepo
`extensions/store/index.json` URL so new providers still appear in Store.

## 3. Topics

```bash
gh repo edit fampep/anikitty --add-topic android,anime,compose,kotlin,educational
gh repo edit fampep/anikitty-extensions --add-topic anikitty,extensions,educational,mit
```

## 4. Framing

Both GitHub repos use the MIT [LICENSE](../LICENSE) (copyright 2026 fampep).  
[`fampep/anikitty-extensions`](https://github.com/fampep/anikitty-extensions) must show that same MIT file at its root. A PolyForm license there is stale.

Keep [extensions/DISCLAIMER.md](../extensions/DISCLAIMER.md) after the split:

- **fampep holds copyright** in AniKitty / protocol / provider source
- MIT: fork, modify, and contribute
- community extensions gladly accepted; **fampep does not control third-party backends**
- provider Kotlin lives in [extensions/providers](../extensions/providers) and is compiled by the app
