// Requires the package: com.unity.nuget.newtonsoft-json
//
// Pose maths is identical to the editor (model/Pose.ts). The editor is y-down / clockwise,
// Unity is y-up / counter-clockwise, so the final matrix is flipped.

using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace Sk2D
{
    public class Sk2dAnimator : MonoBehaviour
    {
        public TextAsset skeletonJson;
        [Tooltip("All exported sprites. Matched by sprite name (= image file name without extension).")]
        public Sprite[] sprites;
        public string animation;
        public bool loop = true;
        public bool playOnStart = true;
        public float speed = 1f;
        [Tooltip("Must match the Pixels Per Unit of the imported sprites.")]
        public float pixelsPerUnit = 100f;

        // ------------------------------------------------------------ data
        class Key { public float time, v0, v1; public string curveType = "linear"; public float[] bez; }
        class Tracks { public List<Key> rotate, translate, scale; }
        class Bone { public string name; public int parent = -1; public float x, y, rot, sx = 1, sy = 1; }
        class Att { public string path; public float x, y, rot, sx = 1, sy = 1, w, h; }
        class Slot
        {
            public string name; public int bone; public float alpha = 1; public string attachment;
            public Dictionary<string, Att> atts = new Dictionary<string, Att>();
            public SpriteRenderer renderer;
        }
        class Anim { public float duration; public Dictionary<string, Tracks> bones = new Dictionary<string, Tracks>(); }
        struct M { public float a, b, c, d, tx, ty; }

        readonly List<Bone> bones = new List<Bone>();
        readonly List<Slot> slots = new List<Slot>();
        readonly Dictionary<string, Anim> anims = new Dictionary<string, Anim>();
        readonly Dictionary<string, Sprite> spriteByName = new Dictionary<string, Sprite>();
        readonly Dictionary<string, int> boneIndex = new Dictionary<string, int>();
        M[] world;
        Anim current;
        float time;
        bool playing;

        // ------------------------------------------------------------ lifecycle
        void Awake()
        {
            if (skeletonJson == null) { Debug.LogError("[Sk2dAnimator] Assign a skeleton JSON file."); return; }
            foreach (var s in sprites) if (s != null) spriteByName[s.name] = s;
            Parse(JObject.Parse(skeletonJson.text));
            BuildSlots();
        }

        void Start()
        {
            if (playOnStart && !string.IsNullOrEmpty(animation)) Play(animation, loop);
            else ApplyPose();
        }

        void Update()
        {
            if (!playing || current == null) return;
            time += Time.deltaTime * speed;
            if (time >= current.duration)
            {
                if (loop && current.duration > 0f) time %= current.duration;
                else { time = current.duration; playing = false; }
            }
            ApplyPose();
        }

        // ------------------------------------------------------------ public API
        public void Play(string name, bool loopAnimation = true)
        {
            if (!anims.TryGetValue(name, out current)) { Debug.LogWarning("[Sk2dAnimator] Unknown animation: " + name); return; }
            animation = name; loop = loopAnimation; time = 0f; playing = true;
            ApplyPose();
        }

        public void Stop() { playing = false; }

        public void SetTime(float t) { time = t; ApplyPose(); }

        public void SetAttachment(string slotName, string attachment)
        {
            var s = slots.Find(x => x.name == slotName);
            if (s != null) s.attachment = attachment;
        }

        // ------------------------------------------------------------ parsing
        void Parse(JObject root)
        {
            foreach (JObject b in (JArray)root["bones"])
            {
                var bone = new Bone
                {
                    name = (string)b["name"],
                    x = (float)b["x"], y = (float)b["y"], rot = (float)b["rotation"],
                    sx = (float)b["scaleX"], sy = (float)b["scaleY"]
                };
                var parent = b["parent"];
                if (parent != null && parent.Type == JTokenType.String) bone.parent = boneIndex[(string)parent];
                boneIndex[bone.name] = bones.Count;
                bones.Add(bone);
            }
            world = new M[bones.Count];

            var skin = (JObject)root["skins"]["default"];
            foreach (JObject s in (JArray)root["slots"])
            {
                var slot = new Slot { name = (string)s["name"], bone = boneIndex[(string)s["bone"]], alpha = (float)s["alpha"] };
                var att = s["attachment"];
                slot.attachment = att != null && att.Type == JTokenType.String ? (string)att : null;
                if (skin[slot.name] is JObject atts)
                    foreach (var p in atts)
                    {
                        var a = (JObject)p.Value;
                        slot.atts[p.Key] = new Att
                        {
                            path = (string)a["path"], x = (float)a["x"], y = (float)a["y"], rot = (float)a["rotation"],
                            sx = (float)a["scaleX"], sy = (float)a["scaleY"], w = (float)a["width"], h = (float)a["height"]
                        };
                    }
                slots.Add(slot);
            }

            foreach (var ap in (JObject)root["animations"])
            {
                var anim = new Anim { duration = (float)ap.Value["duration"] };
                foreach (var bp in (JObject)ap.Value["bones"])
                {
                    var bt = (JObject)bp.Value;
                    anim.bones[bp.Key] = new Tracks
                    {
                        rotate = ParseKeys(bt["rotate"]),
                        translate = ParseKeys(bt["translate"]),
                        scale = ParseKeys(bt["scale"])
                    };
                }
                anims[ap.Key] = anim;
            }
        }

        static List<Key> ParseKeys(JToken token)
        {
            if (token == null) return null;
            var list = new List<Key>();
            foreach (JObject k in (JArray)token)
            {
                var key = new Key { time = (float)k["time"], v0 = (float)k["v"][0], v1 = (float)k["v"][1] };
                var curve = k["curve"];
                if (curve != null && curve.Type == JTokenType.String) key.curveType = (string)curve;
                else if (curve is JArray arr) { key.curveType = "bezier"; key.bez = new[] { (float)arr[0], (float)arr[1], (float)arr[2], (float)arr[3] }; }
                list.Add(key);
            }
            return list;
        }

        void BuildSlots()
        {
            for (int i = 0; i < slots.Count; i++)
            {
                var go = new GameObject(slots[i].name);
                go.transform.SetParent(transform, false);
                var sr = go.AddComponent<SpriteRenderer>();
                sr.sortingOrder = i; // slot order == draw order
                slots[i].renderer = sr;
            }
        }

        // ------------------------------------------------------------ sampling
        static float Ease(Key a, float t)
        {
            if (a.curveType == "linear") return t;
            if (a.curveType == "stepped") return 0f;
            if (t <= 0f) return 0f;
            if (t >= 1f) return 1f;
            float lo = 0f, hi = 1f;
            for (int i = 0; i < 24; i++)
            {
                float mid = (lo + hi) * 0.5f;
                if (Bez(mid, a.bez[0], a.bez[2]) < t) lo = mid; else hi = mid;
            }
            return Bez((lo + hi) * 0.5f, a.bez[1], a.bez[3]);
        }

        static float Bez(float s, float p1, float p2)
        {
            float u = 1f - s;
            return 3f * u * u * s * p1 + 3f * u * s * s * p2 + s * s * s;
        }

        static bool Sample(List<Key> keys, float t, out float v0, out float v1)
        {
            v0 = v1 = 0f;
            if (keys == null || keys.Count == 0) return false;
            if (t <= keys[0].time) { v0 = keys[0].v0; v1 = keys[0].v1; return true; }
            var last = keys[keys.Count - 1];
            if (t >= last.time) { v0 = last.v0; v1 = last.v1; return true; }
            int i = 0;
            while (i < keys.Count - 2 && keys[i + 1].time <= t) i++;
            Key a = keys[i], b = keys[i + 1];
            if (a.curveType == "stepped") { v0 = a.v0; v1 = a.v1; return true; }
            float e = Ease(a, (t - a.time) / (b.time - a.time));
            v0 = a.v0 + (b.v0 - a.v0) * e;
            v1 = a.v1 + (b.v1 - a.v1) * e;
            return true;
        }

        // ------------------------------------------------------------ matrices
        static M TRS(float x, float y, float rotDeg, float sx, float sy)
        {
            float r = rotDeg * Mathf.Deg2Rad, cos = Mathf.Cos(r), sin = Mathf.Sin(r);
            return new M { a = cos * sx, b = sin * sx, c = -sin * sy, d = cos * sy, tx = x, ty = y };
        }

        static M Mul(M p, M l) => new M
        {
            a = p.a * l.a + p.c * l.b, b = p.b * l.a + p.d * l.b,
            c = p.a * l.c + p.c * l.d, d = p.b * l.c + p.d * l.d,
            tx = p.a * l.tx + p.c * l.ty + p.tx, ty = p.b * l.tx + p.d * l.ty + p.ty
        };

        // ------------------------------------------------------------ pose
        void ApplyPose()
        {
            if (world == null) return;
            for (int i = 0; i < bones.Count; i++)
            {
                var b = bones[i];
                float rot = b.rot, x = b.x, y = b.y, sx = b.sx, sy = b.sy;
                Tracks tr = null;
                if (current != null) current.bones.TryGetValue(b.name, out tr);
                if (tr != null)
                {
                    float v0, v1;
                    if (Sample(tr.rotate, time, out v0, out v1)) rot += v0;
                    if (Sample(tr.translate, time, out v0, out v1)) { x += v0; y += v1; }
                    if (Sample(tr.scale, time, out v0, out v1)) { sx *= v0; sy *= v1; }
                }
                var local = TRS(x, y, rot, sx, sy);
                world[i] = b.parent >= 0 ? Mul(world[b.parent], local) : local; // parents are always listed first
            }

            foreach (var slot in slots)
            {
                Att att = null;
                if (slot.attachment != null) slot.atts.TryGetValue(slot.attachment, out att);
                Sprite sprite = null;
                if (att != null) spriteByName.TryGetValue(att.path, out sprite);
                if (att == null || sprite == null) { slot.renderer.enabled = false; continue; }

                slot.renderer.enabled = true;
                slot.renderer.sprite = sprite;
                slot.renderer.color = new Color(1f, 1f, 1f, slot.alpha);

                var m = Mul(world[slot.bone], TRS(att.x, att.y, att.rot, att.sx, att.sy));
                // y-down/clockwise -> y-up/counter-clockwise (conjugate by diag(1,-1))
                float a = m.a, b = -m.b, c = -m.c, d = m.d;
                float sx2 = Mathf.Sqrt(a * a + b * b);
                float sy2 = sx2 > 1e-8f ? (a * d - b * c) / sx2 : 0f;
                var t = slot.renderer.transform;
                t.localPosition = new Vector3(m.tx / pixelsPerUnit, -m.ty / pixelsPerUnit, 0f);
                t.localRotation = Quaternion.Euler(0f, 0f, Mathf.Atan2(b, a) * Mathf.Rad2Deg);
                t.localScale = new Vector3(sx2, sy2, 1f);
            }
        }
    }
}
