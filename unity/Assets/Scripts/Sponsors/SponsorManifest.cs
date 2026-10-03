// SnowThumb sponsor platform: manifest data shapes.
// Field names match the JSON from get_app_manifest() exactly (JsonUtility is name-based).
using System;

namespace SnowThumb.Sponsors
{
    [Serializable]
    public class SponsorManifest
    {
        public int schema;
        public int ttl_seconds;
        public SlotEntry[] slots;
        public GearEntry[] gear;
        public ChallengeEntry[] challenges;
    }

    [Serializable]
    public class SlotEntry
    {
        public string slot_id;
        public string kind;               // banner | feature_wrap | event_title
        public CreativeEntry[] creatives; // sorted by priority desc
    }

    [Serializable]
    public class CreativeEntry
    {
        public string creative_id;
        public string campaign_id;
        public string sponsor_id;
        public string sponsor_name;
        public bool is_house;
        public bool has_link;
        public string url;
        public string sha256;
        public int width;
        public int height;
        public int priority;
        public int weight;
    }

    [Serializable]
    public class GearEntry
    {
        public string id;              // stable, safe to store in player saves
        public string kind;            // board | binding
        public string base_model_id;   // which shipped mesh/prefab to use
        public string name;
        public string tagline;
        public string sponsor_id;
        public string sponsor_name;
        public string creative_id;
        public string texture_url;     // empty = use the texture baked into the prefab
        public string sha256;
        public string unlock;          // free | cred | score | challenge | iap
        public int cred_price;
        public int score_threshold;
        public string iap_product_id;
        public bool has_link;
        public bool in_shop;           // false = only shown to players who already own it
        public int sort;
    }

    [Serializable]
    public class ChallengeEntry
    {
        public string id;
        public string title;
        public string description;
        public string scope;           // run | total
        public string feature;         // any | box | tube | rail | jump
        public string trick;           // any | board_slide | ...
        public int target_count;
        public int min_points;
        public string reward_gear_id;
        public string sponsor_id;
        public string sponsor_name;
        public string ends_at;         // ISO 8601 or empty
        public int sort;
    }
}
