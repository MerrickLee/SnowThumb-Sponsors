// SnowThumb sponsor platform: applies a gear item's sponsor texture to a board or
// binding renderer. Put it on the board/binding prefab and call Apply(gearId)
// when the player equips something (and on run start).
using UnityEngine;

namespace SnowThumb.Sponsors
{
    public class SponsorGearSkin : MonoBehaviour
    {
        [SerializeField] Renderer target;
        [SerializeField] int materialIndex = 0;
        [SerializeField] string textureProperty = "_BaseMap";
        [Tooltip("The prefab's own art, used for house gear or while a sponsor texture is loading.")]
        [SerializeField] Texture defaultTexture;

        MaterialPropertyBlock mpb;
        string pendingSha;

        void Awake()
        {
            if (!target) target = GetComponentInChildren<Renderer>();
            mpb = new MaterialPropertyBlock();
        }

        void OnDisable()
        {
            var svc = SponsorManifestService.Instance;
            if (svc) svc.TextureReady -= OnTextureReady;
        }

        public void Apply(string gearId)
        {
            var svc = SponsorManifestService.Instance;
            var gear = svc ? svc.FindGear(gearId) : null;
            Texture tex = defaultTexture;
            pendingSha = null;

            if (gear != null && !string.IsNullOrEmpty(gear.sha256))
            {
                if (svc.TryGetTexture(gear.sha256, out var t)) tex = t;
                else
                {
                    pendingSha = gear.sha256;
                    svc.TextureReady -= OnTextureReady;
                    svc.TextureReady += OnTextureReady;
                    svc.StartCoroutine(svc.EnsureTexture(gear.texture_url, gear.sha256));
                }
            }
            Set(tex);
        }

        void OnTextureReady(string sha)
        {
            if (sha != pendingSha) return;
            var svc = SponsorManifestService.Instance;
            if (svc && svc.TryGetTexture(sha, out var t)) Set(t);
            pendingSha = null;
            svc.TextureReady -= OnTextureReady;
        }

        void Set(Texture tex)
        {
            if (!target || !tex) return;
            target.GetPropertyBlock(mpb, materialIndex);
            mpb.SetTexture(textureProperty, tex);
            target.SetPropertyBlock(mpb, materialIndex);
        }
    }
}
