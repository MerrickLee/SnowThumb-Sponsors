// SnowThumb sponsor platform: run lifecycle, event queue, and sponsor links.
// Self-starting; no scene setup needed beyond SponsorManifestService.
//
// Your game code calls:
//   SponsorEvents.BeginRun();                 // when the player drops in
//   SponsorEvents.Track("run_with_gear", gearItemId: equippedBoardId);
//   SponsorEvents.EndRun();                   // on finish or bail-out to menu
//   SponsorEvents.OpenSponsorLink(gearItemId: "board_croesave_2026");  // shop button only
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace SnowThumb.Sponsors
{
    public static class SponsorEvents
    {
        [Serializable]
        class Evt
        {
            public string client_event_id, type, occurred_at, install_id, session_id, run_id,
                          platform, app_version, creative_id, slot_id, gear_item_id, challenge_id;
            public int duration_ms;
        }

        [Serializable]
        class Batch { public List<Evt> events = new List<Evt>(); }

        const int MaxQueue = 500;
        const int FlushAt = 25;
        const float FlushEverySeconds = 30f;
        const string InstallKey = "st_install_id";

        static readonly List<Evt> queue = new List<Evt>();
        static bool initialized;

        public static string InstallId { get; private set; } = "";
        public static string SessionId { get; private set; } = Guid.NewGuid().ToString();
        public static string CurrentRunId { get; private set; } = "";
        public static bool InRun { get; private set; }

        public static event Action RunStarted;
        public static event Action RunEnded;

        static string QueuePath => Path.Combine(Application.persistentDataPath, "sponsor", "events.json");

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Init()
        {
            if (initialized) return;
            initialized = true;

            InstallId = PlayerPrefs.GetString(InstallKey, "");
            if (string.IsNullOrEmpty(InstallId))
            {
                InstallId = Guid.NewGuid().ToString();
                PlayerPrefs.SetString(InstallKey, InstallId);
                PlayerPrefs.Save();
            }
            LoadQueue();

            var go = new GameObject("SponsorEventsRunner") { hideFlags = HideFlags.HideAndDontSave };
            UnityEngine.Object.DontDestroyOnLoad(go);
            go.AddComponent<Runner>();
        }

        // ---------- Run lifecycle ----------

        public static void BeginRun()
        {
            CurrentRunId = Guid.NewGuid().ToString();
            InRun = true;
            RunStarted?.Invoke();
        }

        public static void EndRun()
        {
            InRun = false;
            RunEnded?.Invoke();
        }

        // ---------- Tracking ----------

        /// <summary>
        /// type: impression | gear_view | gear_unlock | gear_equip | run_with_gear |
        ///       challenge_start | challenge_complete   (clicks are logged server-side by /go)
        /// </summary>
        public static void Track(string type, string creativeId = null, string slotId = null,
                                 string gearItemId = null, string challengeId = null, int durationMs = 0)
        {
            if (queue.Count >= MaxQueue) queue.RemoveAt(0);
            queue.Add(new Evt
            {
                client_event_id = Guid.NewGuid().ToString(),
                type = type,
                occurred_at = DateTime.UtcNow.ToString("o"),
                install_id = InstallId,
                session_id = SessionId,
                run_id = InRun ? CurrentRunId : "",
                platform = PlatformName(),
                app_version = Application.version,
                creative_id = creativeId ?? "",
                slot_id = slotId ?? "",
                gear_item_id = gearItemId ?? "",
                challenge_id = challengeId ?? "",
                duration_ms = durationMs
            });
        }

        /// <summary>Opens the sponsor's site through the click-tracking redirect.</summary>
        public static void OpenSponsorLink(string creativeId = null, string gearItemId = null)
        {
            var svc = SponsorManifestService.Instance;
            if (!svc) return;
            string q = !string.IsNullOrEmpty(creativeId)
                ? "cr=" + Uri.EscapeDataString(creativeId)
                : !string.IsNullOrEmpty(gearItemId) ? "g=" + Uri.EscapeDataString(gearItemId) : null;
            if (q == null) return;
            Application.OpenURL($"{svc.FunctionsBaseUrl}/go?{q}&i={InstallId}&p={PlatformName()}");
        }

        static string PlatformName()
        {
            if (Application.isEditor) return "editor";
            switch (Application.platform)
            {
                case RuntimePlatform.IPhonePlayer: return "ios";
                case RuntimePlatform.Android: return "android";
                default: return "unknown";
            }
        }

        // ---------- Persistence ----------

        static void LoadQueue()
        {
            try
            {
                if (!File.Exists(QueuePath)) return;
                var b = JsonUtility.FromJson<Batch>(File.ReadAllText(QueuePath));
                if (b?.events != null) queue.AddRange(b.events);
            }
            catch { /* corrupt queue file: drop it */ }
        }

        static void SaveQueue()
        {
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(QueuePath));
                File.WriteAllText(QueuePath, JsonUtility.ToJson(new Batch { events = new List<Evt>(queue) }));
            }
            catch { /* best-effort */ }
        }

        class Runner : MonoBehaviour
        {
            float nextFlush;
            bool sending;

            void Update()
            {
                if (sending || queue.Count == 0) return;
                if (queue.Count >= FlushAt || Time.realtimeSinceStartup >= nextFlush) StartCoroutine(Flush());
            }

            void OnApplicationPause(bool paused) { if (paused) SaveQueue(); }
            void OnApplicationQuit() => SaveQueue();

            IEnumerator Flush()
            {
                sending = true;
                nextFlush = Time.realtimeSinceStartup + FlushEverySeconds;

                var svc = SponsorManifestService.Instance;
                if (!svc) { sending = false; yield break; }

                int n = Mathf.Min(queue.Count, 100);
                var sent = queue.GetRange(0, n);
                var body = Encoding.UTF8.GetBytes(JsonUtility.ToJson(new Batch { events = sent }));

                using (var req = new UnityWebRequest($"{svc.FunctionsBaseUrl}/track", "POST"))
                {
                    req.uploadHandler = new UploadHandlerRaw(body);
                    req.downloadHandler = new DownloadHandlerBuffer();
                    req.timeout = 10;
                    req.SetRequestHeader("Content-Type", "application/json");
                    yield return req.SendWebRequest();

                    long code = req.responseCode;
                    bool ok = req.result == UnityWebRequest.Result.Success;
                    bool poison = code >= 400 && code < 500 && code != 429; // bad batch: don't retry forever
                    if (ok || poison)
                    {
                        foreach (var e in sent) queue.Remove(e);
                        SaveQueue();
                    }
                }
                sending = false;
            }
        }
    }
}
