// SnowThumb sponsor platform: put this on every sellable surface in the park
// (banners, rail wrap, box top, kicker face, event title). The slotId must match
// a row in the Supabase `slots` table.
using UnityEngine;

namespace SnowThumb.Sponsors
{
    public class SponsorSlot : MonoBehaviour
    {
        [SerializeField] string slotId = "park_banner_start_gate";
        [SerializeField] Renderer target;
        [SerializeField] int materialIndex = 0;
        [Tooltip("URP Lit/Unlit = _BaseMap, Built-in Standard = _MainTex")]
        [SerializeField] string textureProperty = "_BaseMap";
        [Tooltip("Baked-in house ad (Croes Ave / Love Capital). Shown offline or when nothing is live.")]
        [SerializeField] Texture fallbackTexture;

        [Header("Impression rules")]
        [Tooltip("Fraction of the screen the slot must cover to count as seen.")]
        [SerializeField, Range(0.001f, 0.2f)] float minScreenFraction = 0.01f;
        [Tooltip("Cumulative on-screen seconds per run before an impression is logged.")]
        [SerializeField] float impressionSeconds = 1f;

        public string SlotId => slotId;
        public CreativeEntry Current { get; private set; }

        MaterialPropertyBlock mpb;
        float visibleTime;
        bool impressionLogged;
        Camera cam;

        void Awake()
        {
            if (!target) target = GetComponent<Renderer>();
            mpb = new MaterialPropertyBlock();
        }

        void OnEnable()
        {
            var svc = SponsorManifestService.Instance;
            if (svc)
            {
                svc.ManifestChanged += OnManifestChanged;
                svc.TextureReady += OnTextureReady;
            }
            SponsorEvents.RunStarted += Refresh;
            Refresh();
        }

        void OnDisable()
        {
            var svc = SponsorManifestService.Instance;
            if (svc)
            {
                svc.ManifestChanged -= OnManifestChanged;
                svc.TextureReady -= OnTextureReady;
            }
            SponsorEvents.RunStarted -= Refresh;
        }

        // Never swap a paid creative mid-run; only upgrade from the fallback.
        void OnManifestChanged() { if (!SponsorEvents.InRun || Current == null) Refresh(); }
        void OnTextureReady(string _) { if (Current == null) Refresh(); }

        public void Refresh()
        {
            if (!target) return;
            var svc = SponsorManifestService.Instance;
            var rng = new System.Random(StableSeed(SponsorEvents.CurrentRunId + slotId));

            Current = svc ? svc.PickCreative(slotId, rng) : null;
            Texture tex = fallbackTexture;
            if (Current != null && svc.TryGetTexture(Current.sha256, out var t)) tex = t;
            else Current = null;

            target.GetPropertyBlock(mpb, materialIndex);
            if (tex) mpb.SetTexture(textureProperty, tex);
            target.SetPropertyBlock(mpb, materialIndex);

            visibleTime = 0f;
            impressionLogged = false;
        }

        /// <summary>Call from a "Visit sponsor" button. Never call mid-run.</summary>
        public void OpenSponsorLink()
        {
            if (Current != null && Current.has_link) SponsorEvents.OpenSponsorLink(creativeId: Current.creative_id);
        }

        void Update()
        {
            if (impressionLogged || Current == null || !SponsorEvents.InRun || !target || !target.isVisible) return;
            if (!cam) cam = Camera.main;
            if (!cam) return;
            if (ScreenFraction(cam, target.bounds) < minScreenFraction) return;

            visibleTime += Time.deltaTime;
            if (visibleTime >= impressionSeconds)
            {
                impressionLogged = true;
                SponsorEvents.Track("impression",
                    creativeId: Current.creative_id,
                    slotId: slotId,
                    durationMs: Mathf.RoundToInt(visibleTime * 1000f));
            }
        }

        static float ScreenFraction(Camera cam, Bounds b)
        {
            Vector3 c = b.center, e = b.extents;
            float minX = 1f, minY = 1f, maxX = 0f, maxY = 0f;
            bool any = false;
            for (int i = 0; i < 8; i++)
            {
                var corner = c + Vector3.Scale(e, new Vector3((i & 1) == 0 ? -1 : 1, (i & 2) == 0 ? -1 : 1, (i & 4) == 0 ? -1 : 1));
                var v = cam.WorldToViewportPoint(corner);
                if (v.z <= 0f) continue;
                any = true;
                minX = Mathf.Min(minX, v.x); maxX = Mathf.Max(maxX, v.x);
                minY = Mathf.Min(minY, v.y); maxY = Mathf.Max(maxY, v.y);
            }
            if (!any) return 0f;
            minX = Mathf.Clamp01(minX); maxX = Mathf.Clamp01(maxX);
            minY = Mathf.Clamp01(minY); maxY = Mathf.Clamp01(maxY);
            return Mathf.Max(0f, maxX - minX) * Mathf.Max(0f, maxY - minY);
        }

        static int StableSeed(string s)
        {
            unchecked
            {
                int h = 23;
                foreach (char ch in s) h = h * 31 + ch;
                return h;
            }
        }
    }
}
