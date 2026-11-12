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

```bash
git subtree split -P extensions -b extensions-publish
git push git@github.com:fampep/anikitty-extensions.git extensions-publish:main
# or: git push https://github.com/fampep/anikitty-extensions.git extensions-publish:main
```

Confirm raw store index loads:

`https://raw.githubusercontent.com/fampep/anikitty-extensions/main/store/index.json`

## 3. Topics

```bash
gh repo edit fampep/anikitty --add-topic android,anime,compose,kotlin,educational
gh repo edit fampep/anikitty-extensions --add-topic anikitty,extensions,educational,polyform-noncommercial
```

## 4. Framing

Keep [extensions/DISCLAIMER.md](../extensions/DISCLAIMER.md) and PolyForm Noncommercial [LICENSE](../extensions/LICENSE) at the repo root after the split:

- **fampep owns** AniKitty / protocol code  
- educational / noncommercial use  
- community extensions gladly accepted; **owner does not control third-party backends**
