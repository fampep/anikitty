package site.anikitty.app.data.extensions

import org.json.JSONObject

object ExtensionManifestParser {
    fun parse(
        raw: String,
        sourceGithub: String? = null,
        manifestUrl: String? = null,
    ): ExtensionManifest {
        val o = JSONObject(raw)
        val api = o.getInt("apiVersion")
        require(api == ExtensionManifest.SUPPORTED_API) {
            "Unsupported apiVersion $api (need ${ExtensionManifest.SUPPORTED_API})"
        }
        val id = o.getString("id").trim()
        require(id.matches(Regex("""^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$"""))) {
            "Invalid extension id"
        }
        val baseUrl = o.getString("baseUrl").trim().trimEnd('/')
        require(baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
            "baseUrl must be http(s)"
        }
        return ExtensionManifest(
            apiVersion = api,
            id = id,
            name = o.getString("name").trim(),
            version = o.getString("version").trim(),
            description = o.optString("description", "").trim(),
            author = o.optString("author", "").trim(),
            homepage = o.optionalString("homepage"),
            baseUrl = baseUrl,
            resolvePath = o.optString("resolvePath", ExtensionManifest.DEFAULT_RESOLVE_PATH)
                .ifBlank { ExtensionManifest.DEFAULT_RESOLVE_PATH },
            iconUrl = o.optionalString("iconUrl"),
            nsfw = o.optBoolean("nsfw", false),
            sourceGithub = sourceGithub ?: o.optionalString("sourceGithub"),
            manifestUrl = manifestUrl ?: o.optionalString("manifestUrl"),
        )
    }

    private fun JSONObject.optionalString(key: String): String? {
        if (!has(key) || isNull(key)) return null
        return optString(key, "").trim().takeIf { it.isNotEmpty() && it != "null" }
    }

    fun toJson(m: ExtensionManifest): String {
        val o = JSONObject()
        o.put("apiVersion", m.apiVersion)
        o.put("id", m.id)
        o.put("name", m.name)
        o.put("version", m.version)
        o.put("description", m.description)
        o.put("author", m.author)
        if (m.homepage != null) o.put("homepage", m.homepage)
        o.put("baseUrl", m.baseUrl)
        o.put("resolvePath", m.resolvePath)
        if (m.iconUrl != null) o.put("iconUrl", m.iconUrl)
        o.put("nsfw", m.nsfw)
        if (m.sourceGithub != null) o.put("sourceGithub", m.sourceGithub)
        if (m.manifestUrl != null) o.put("manifestUrl", m.manifestUrl)
        return o.toString()
    }
}
