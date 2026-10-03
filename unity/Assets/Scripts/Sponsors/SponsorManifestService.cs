// SnowThumb sponsor platform: downloads the manifest + sponsor images, caches them,
// and hands textures to SponsorSlot / gear code. Put ONE of these in your boot scene.
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using UnityEngine;
using UnityEngine.Networking;

namespace SnowThumb.Sponsors
{
    public class SponsorManifestService : MonoBehaviour
    {
        public static SponsorManifestService Instance { get; private set; }

        [Tooltip("https://estcsgjculwlrtklidic.supabase.co/functions/v1  (no trailing slash)")]
        [SerializeField] string functionsBaseUrl = "https://estcsgjculwlrtklidic.supabase.co/functions/v1";
        [SerializeField] int fallbackTtlSeconds = 900;

        public string FunctionsBaseUrl => functionsBaseUrl;
        public SponsorManifest Manifest { get; private set; }

        /// <summary>Fires when a new manifest is applied (launch cache, or fresh download).</summary>
        public event Action ManifestChanged;
        /// <summary>Fires with a sha256 when that texture finishes loading.</summary>
        public event Action<string> TextureReady;

        readonly Dictionary<string, Texture2D> textures = new Dictionary<string, Texture2D>();
        readonly HashSet<string> loading = new HashSet<string>();
        float lastFetch = -100000f;
        bool fetching;

        string Root => Path.Combine(Application.persistentDataPath, "sponsor");
        string TexDir => Path.Combine(Root, "tex");
        string ManifestPath => Path.Combine(Root, "manifest.json");
        string EtagPath => Path.Combine(Root, "manifest.etag");
        int Ttl => Manifest != null && Manifest.ttl_seconds > 0 ? Manifest.ttl_seconds : fallbackTtlSeconds;

        void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            Directory.CreateDirectory(TexDir);
            LoadCachedManifest();   // instant: works offline, no blank slots on launch
        }

        void Start() => StartCoroutine(Fetch());

        void OnApplicationPause(bool paused)
        {
            if (!paused && Time.realtimeSinceStartup - lastFetch > Ttl) StartCoroutine(Fetch());
        }

        // ---------- Manifest ----------

        void LoadCachedManifest()
        {
            try
            {
                if (File.Exists(ManifestPath)) Apply(File.ReadAllText(ManifestPath));
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[Sponsor] Cached manifest unreadable: {e.Message}");
            }
        }

        public IEnumerator Fetch()
        {
            if (fetching) yield break;
            fetching = true;
            lastFetch = Time.realtimeSinceStartup;

            using (var req = UnityWebRequest.Get($"{functionsBaseUrl}/manifest"))
            {
                req.timeout = 10;
                if (Manifest != null && File.Exists(EtagPath))
                    req.SetRequestHeader("If-None-Match", File.ReadAllText(EtagPath));

                yield return req.SendWebRequest();

                if (req.responseCode == 304)
                {
                    fetching = false;
                    yield break;
                }
                if (req.result != UnityWebRequest.Result.Success)
                {
                    Debug.LogWarning($"[Sponsor] Manifest fetch failed: {req.error}. Using cache/house ads.");
                    fetching = false;
                    yield break;
                }

                string json = req.downloadHandler.text;
                if (Apply(json))
                {
                    try
                    {
                        File.WriteAllText(ManifestPath, json);
                        string etag = req.GetResponseHeader("ETag");
                        if (!string.IsNullOrEmpty(etag)) File.WriteAllText(EtagPath, etag);
                    }
                    catch (Exception e)
                    {
                        Debug.LogWarning($"[Sponsor] Could not cache manifest: {e.Message}");
                    }
                }
            }
            fetching = false;
        }

        bool Apply(string json)
        {
            SponsorManifest m;
            try { m = JsonUtility.FromJson<SponsorManifest>(json); }
            catch { return false; }
            if (m == null || m.schema != 1) return false;

            Manifest = m;
            ManifestChanged?.Invoke();
            PrefetchAll();
            return true;
        }

        void PrefetchAll()
        {
            if (Manifest.slots != null)
                foreach (var s in Manifest.slots)
                    if (s.creatives != null)
                        foreach (var c in s.creatives) StartCoroutine(EnsureTexture(c.url, c.sha256));

            if (Manifest.gear != null)
                foreach (var g in Manifest.gear) StartCoroutine(EnsureTexture(g.texture_url, g.sha256));
        }

        // ---------- Textures ----------

        public bool TryGetTexture(string sha256, out Texture2D tex)
        {
            tex = null;
            return !string.IsNullOrEmpty(sha256) && textures.TryGetValue(sha256, out tex);
        }

        public IEnumerator EnsureTexture(string url, string sha256)
        {
            if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(sha256)) yield break;
            if (textures.ContainsKey(sha256) || loading.Contains(sha256)) yield break;
            loading.Add(sha256);

            string path = Path.Combine(TexDir, sha256);
            byte[] bytes = null;

            if (File.Exists(path))
            {
                bytes = File.ReadAllBytes(path);
                if (!HashMatches(bytes, sha256)) { File.Delete(path); bytes = null; }
            }

            if (bytes == null)
            {
                using (var req = UnityWebRequest.Get(url))
                {
                    req.timeout = 20;
                    yield return req.SendWebRequest();
                    if (req.result == UnityWebRequest.Result.Success)
                    {
                        var data = req.downloadHandler.data;
                        if (HashMatches(data, sha256))
                        {
                            bytes = data;
                            try { File.WriteAllBytes(path, bytes); } catch { /* cache is best-effort */ }
                        }
                        else Debug.LogWarning($"[Sponsor] Hash mismatch for {url}, ignoring.");
                    }
                    else Debug.LogWarning($"[Sponsor] Image download failed: {url} ({req.error})");
                }
            }

            if (bytes != null)
            {
                var tex = new Texture2D(2, 2, TextureFormat.RGBA32, true);
                if (tex.LoadImage(bytes, false))
                {
                    tex.wrapMode = TextureWrapMode.Clamp;
                    tex.anisoLevel = 4;
                    tex.Apply(true, true); // build mips, drop the CPU copy to save memory
                    textures[sha256] = tex;
                    loading.Remove(sha256);
                    TextureReady?.Invoke(sha256);
                    yield break;
                }
                Destroy(tex);
            }
            loading.Remove(sha256);
        }

        static bool HashMatches(byte[] data, string expectedHex)
        {
            using (var sha = SHA256.Create())
            {
                var hash = sha.ComputeHash(data);
                var sb = new System.Text.StringBuilder(hash.Length * 2);
                foreach (var b in hash) sb.Append(b.ToString("x2"));
                return string.Equals(sb.ToString(), expectedHex, StringComparison.OrdinalIgnoreCase);
            }
        }

        // ---------- Lookups ----------

        /// <summary>
        /// Highest priority tier wins (paid 10+ beats house 0); weighted random inside the tier.
        /// Only returns creatives whose texture is already loaded, so a slot is never blank.
        /// </summary>
        public CreativeEntry PickCreative(string slotId, System.Random rng)
        {
            if (Manifest?.slots == null) return null;
            foreach (var s in Manifest.slots)
            {
                if (s.slot_id != slotId || s.creatives == null) continue;

                int top = int.MinValue;
                foreach (var c in s.creatives)
                    if (textures.ContainsKey(c.sha256 ?? "")) top = Math.Max(top, c.priority);
                if (top == int.MinValue) return null;

                int total = 0;
                foreach (var c in s.creatives)
                    if (c.priority == top && textures.ContainsKey(c.sha256 ?? "")) total += Math.Max(1, c.weight);

                int roll = rng.Next(total);
                foreach (var c in s.creatives)
                {
                    if (c.priority != top || !textures.ContainsKey(c.sha256 ?? "")) continue;
                    roll -= Math.Max(1, c.weight);
                    if (roll < 0) return c;
                }
            }
            return null;
        }

        public GearEntry FindGear(string gearId)
        {
            if (Manifest?.gear == null) return null;
            foreach (var g in Manifest.gear) if (g.id == gearId) return g;
            return null;
        }

        public IEnumerable<GearEntry> ShopGear(string kind)
        {
            if (Manifest?.gear == null) yield break;
            foreach (var g in Manifest.gear) if (g.in_shop && g.kind == kind) yield return g;
        }

        public IEnumerable<ChallengeEntry> ActiveChallenges()
        {
            if (Manifest?.challenges == null) yield break;
            foreach (var c in Manifest.challenges) yield return c;
        }
    }
}
