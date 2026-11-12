# Public GitHub setup (maintainers)

Cloud agent tokens for this project **cannot** always:

- `gh repo create fampep/anikitty-extensions`
- `gh repo edit fampep/anikitty --visibility public`

Run these as the `fampep` account when ready:

## 1. Make the app repo public (AP-36)

```bash
gh repo edit fampep/anikitty --visibility public --accept-visibility-change-consequences
```

## 2. Publish the extensions repo (AP-33)

```bash
# from a clean clone of anikitty
git subtree split -P extensions -b extensions-publish
gh repo create fampep/anikitty-extensions --public \
  --description "AniKitty stream-server extensions: manifest spec, SDK guide, store, examples"
git push git@github.com:fampep/anikitty-extensions.git extensions-publish:main
```

Or copy the `extensions/` tree into a new empty public repo.

Update Android `ExtensionStoreClient.DEFAULT_INDEX_URLS` if the raw URLs change (already prefers `fampep/anikitty-extensions` first).

## 3. Topics / homepage (optional)

```bash
gh repo edit fampep/anikitty --add-topic android,anime,compose,kotlin
gh repo edit fampep/anikitty-extensions --add-topic anikitty,extensions
```
