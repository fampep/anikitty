# Public GitHub setup (maintainers)

Cloud agent tokens for this project **cannot**:

- `gh repo create fampep/anikitty-extensions` (`createRepository` forbidden for the integration)
- always flip `fampep/anikitty` → public

Run these as the **fampep** GitHub user when ready.

## 1. Make the app repo public (optional community surface)

```bash
gh repo edit fampep/anikitty --visibility public --accept-visibility-change-consequences
```

## 2. Create & publish `fampep/anikitty-extensions` (required for store raw URLs)

From a clone of anikitty that contains the `extensions/` tree (MIT + DISCLAIMER included):

```bash
gh repo create fampep/anikitty-extensions --public \
  --description "Educational AniKitty extension protocol — community BYO resolvers. Maintainers do not control third-party backends." \
  --homepage "https://github.com/fampep/anikitty"

git subtree split -P extensions -b extensions-publish
git push git@github.com:fampep/anikitty-extensions.git extensions-publish:main
```

Confirm raw store index loads:

`https://raw.githubusercontent.com/fampep/anikitty-extensions/main/store/index.json`

Android already prefers that URL in `ExtensionStoreClient.DEFAULT_INDEX_URLS`.

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
