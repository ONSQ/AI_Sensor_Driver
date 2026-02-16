# AI_Sensor_Driver
MVP for K-12 AI Project 



SENSOR RACER v2
Game Architecture Document

A Glass-Box AI Education Platform
Teaching 8th Graders How Autonomous Vehicles Think

Owen Eskew & Diego Rodriguez 
Machine Learning Explainability — Spring 2026
ONSQ Enterprises
  
1. Core Concept
The Big Idea: Students drive a 3D car through an immersive environment with full human vision. Then their screen goes dark — and they must navigate using only the AI sensor panels. This forces them to experience perception the way an autonomous vehicle does: no eyes, just data.
The “Aha” Moment: "Oh — this is what it's like to be an AI. It doesn't see the world. It reads numbers, point clouds, heat maps, and sound waves — and somehow has to make life-or-death driving decisions from that."
Glass-Box Principle: Every AI decision is transparent. Students can see what data the sensors collected, how the neural network processed it, what decision was made and why, and what the AI got right and wrong.
2. Engine & Platform
Component	Decision	Rationale
Game Engine	Three.js (WebGL)	Browser-based, real raycasting, 60fps, no install
Target	Research environment	No hardware constraints, full capability
Language	JavaScript / React	Fast iteration, immediate deployment
Deployment	URL-based	Share a link, it just works
AI Framework	TensorFlow.js	Real ML in-browser, research-credible
3. World Architecture
3.1 Layout
Hybrid city/neighborhood grid layout of approximately 4×4 blocks combining dense urban areas with residential neighborhoods, connected by a road network with intersections throughout.
•	Dense city blocks: tall buildings, narrow streets, alleys, storefronts
•	Residential blocks: houses, wider streets, yards, driveways
•	Connected intersections with functional traffic signals
3.2 Zone Types
Zone types occupy fixed positions on the grid. Obstacle placement, pedestrian paths, timing, and weather shuffle each session using a seed-based system for research reproducibility.
Zone	Key Elements	Primary Sensor Challenge
City Block	Traffic lights, parked cars, pedestrian crossings	Camera/CV classification, LiDAR spatial
School Zone	Speed signs, children, ball-in-street hazard	Thermal (detect children), implied hazard prediction
Construction Zone	Cones, barriers, detour signs, workers	LiDAR (obstacle density), Audio (machinery)
Residential Area	Houses, driveways, animals, quiet streets	Thermal (animals), Audio (barking, engines)
Hospital / Emergency	Ambulance spawn, siren events	Audio (siren direction), all-sensor fusion
3.3 Environmental Elements
•	Pedestrians crossing streets (walking animations, crosswalk logic, jaywalking)
•	Parked and moving vehicles (drive routes, obey traffic signals)
•	Emergency vehicle with siren (spatial audio, traffic yields)
•	Construction zone with cones, barriers, and workers
•	Animals — dogs and deer with unpredictable movement patterns
•	Traffic signals and stop signs (functional, must be obeyed)
•	School zone with children (high-penalty area)
•	Weather effects — rain and fog (affects visibility and sensor performance)
•	Ball rolling from between parked cars (implied hazard — child may follow)
3.4 Time of Day
Progressive lighting: starts daylight, transitions through dusk to night. This directly supports the game flow — as natural light fades, sensors become increasingly critical. Thermal imaging becomes essential at night; camera/CV degrades significantly.
3.5 Animation & Collision
Fully animated world with real collision consequences:
Collision Type	Consequence	Score Impact
Pedestrian / child / animal	Hard stop, screen flash, incident logged	-500 / -300
Vehicle	Physics bounce, car slows, damage indicator	-200
Cone / barrier	Knockback, audio feedback	-50
Building / wall	Dead stop, must reverse	-25
Red light run	Penalty + cross-traffic collision risk	-100
School zone speeding	Score penalty	-75
Near-miss (avoided obstacle)	Rewarded — proves sensor awareness	+50
3.6 3D Objects
Mixed approach: primitives for minor objects (cones, barriers, signs) and imported GLTF/low-poly models for key objects (cars, people, animals). All objects have proper mesh geometry for raycasting — LiDAR rays hit real surfaces.
 4. Sensor Systems
Four sensor systems work together to provide the AI with a complete understanding of the environment. Each has strengths and weaknesses — no single sensor works in every condition.
4.1 LiDAR (Light Detection and Ranging)
•	Adjustable ray count: 24 / 48 / 72 rays (student controls density)
•	Three.js Raycaster fires against real mesh geometry — returns actual distances
•	3D point cloud visualization showing height data
•	Color-coded by distance: close = red, mid = yellow, far = green
•	Rotating sweep animation for realism
•	Light weather degradation: fog cuts range, rain adds noise
•	Teaches: spatial mapping, resolution tradeoffs, point cloud representation
4.2 Thermal IR (Infrared Camera)
•	360° overhead heatmap — full situational awareness
•	Realistic FLIR palette: white → yellow → red → purple → black
•	Optional temperature overlay toggle (numeric readouts on/off)
•	Thermal signatures: humans 37°C, animals 35–38°C, running engines 80–95°C, buildings cold
•	Line-of-sight blocked by walls (no seeing through buildings)
•	Slight degradation in rain/fog; distance-based intensity falloff
•	Teaches: infrared sensing, heat signatures, why thermal matters at night
4.3 Audio (Microphone Array)
•	Real spatial audio via Web Audio API (headphones required)
•	3D positioned sound sources with distance falloff and Doppler effect
•	Waveform + directional display (frequency bands with bearing indicators)
•	8 sound types: emergency sirens, car horns, human voices, engine noise, dog barking, ball bouncing, rain/wind ambient, construction noise
•	Sound classification labels on sensor display
•	Rain raises noise floor (teaches signal-to-noise concept)
•	Teaches: beamforming, sound classification, around-corners advantage
4.4 Camera / Computer Vision
•	4 views: Left (~60°), Center (~90°), Right (~60°), Rear mirror (~40°)
•	Processed view ONLY — black background with bounding boxes, class labels, confidence %
•	Object classes: person, child, vehicle, bicycle, animal, sign, traffic light, cone, barrier, ball
•	Confidence degrades realistically: great in daylight → worse at dusk → nearly useless at night
•	Occlusion handled: partial objects get lower confidence or “OCCLUDED” tag
•	Color-coded boxes by object class
•	Teaches: object detection, classification, confidence scores, CV limitations
4.5 Sensor Complementarity Matrix
This matrix demonstrates why sensor fusion is essential — no single sensor works in all conditions:
Condition	LiDAR	Thermal	Audio	Camera
Daylight, clear	✅ Great	⚠️ Okay	✅ Great	✅ Great
Night	✅ Great	✅ Best	✅ Great	❌ Poor
Fog	⚠️ Reduced	⚠️ Degraded	✅ Great	❌ Poor
Rain	⚠️ Noisy	⚠️ Degraded	⚠️ Noisy	⚠️ Degraded
Behind wall	❌ Blocked	❌ Blocked	✅ Works	❌ Blocked
Object ID	❌ Can't classify	⚠️ Alive vs not	⚠️ Sound type	✅ Best
 5. AI Implementation
5.1 Architecture Overview
The AI uses a hybrid architecture combining neural network perception with utility-based decision-making and behavior tree safety overrides. The model is pre-trained and performs live fine-tuning during gameplay.
Layer	Technology	Function
Perception	TensorFlow.js neural network	Processes raw sensor data into situation assessment
Decision	Utility scoring system	Evaluates and selects optimal driving actions
Safety	Behavior tree overrides	Hard safety rules that override all other decisions
Learning	Pre-trained + live fine-tuning	Competent at start, adapts to current conditions
5.2 Perception Layer: TensorFlow.js
A real neural network running in-browser processes all four sensor inputs simultaneously:
Inputs: LiDAR distances (24–72 values), thermal blob data (positions, temperatures, sizes), audio source vectors (directions, types, intensities), Camera/CV bounding box data (classes, positions, confidence scores).
Outputs (Situation Assessment): Obstacle map with positions and sizes, object classifications with merged multi-sensor confidence, threat levels per object (HIGH / MEDIUM / LOW), environmental state (weather, visibility, road condition), navigation vector to next waypoint.
All intermediate layer activations are accessible for glass box visualization. Pre-trained weights load at session start; live fine-tuning adjusts to current conditions during gameplay.
5.3 Decision Layer: Utility Scoring
When no safety override is active, the AI evaluates candidate actions and selects the highest-scoring option:
•	Candidate actions: go straight, turn left, turn right, brake, accelerate
•	Path clearance score: is the way ahead open?
•	Waypoint alignment: does this action move toward the goal?
•	Speed appropriateness: is the current speed right for this zone?
•	Comfort: is this a smooth maneuver?
Glass box display: "Straight: 40 | Left: 85 | Brake: 92 → chose BRAKE"
5.4 Safety Override: Behavior Tree
Hard rules that run before utility scoring and cannot be overridden:
•	Imminent collision (< 3m) → emergency brake
•	Red light → stop
•	Pedestrian/child in path → stop
•	Emergency vehicle approaching → yield and pull right
Glass box display: "⚠️ SAFETY OVERRIDE: Emergency brake — pedestrian at 4m"
This teaches students that safety rules are non-negotiable, even for AI.
5.5 AI Behavior Characteristics
Mistakes (realistic, occasional): The AI occasionally misclassifies objects, detects obstacles late, or hesitates when sensors disagree. Mistakes are rare in good conditions but more common in rain, fog, and darkness. The glass box always explains errors: "[Error] Misclassified object at 15m — corrected after 0.8s." This teaches students that AI is powerful but not perfect.
Confidence (realistic mix): The AI expresses high confidence on clear detections ("Person detected — 96% confidence — braking") and appropriate uncertainty on edge cases ("Possible pedestrian — 54% — slowing, seeking confirmation from thermal"). This shows students that AI quantifies uncertainty rather than guessing.
5.6 Sensor Fusion Logic
•	Each detection starts from individual sensor data
•	Multi-sensor detections are merged: LiDAR + thermal + camera = highest confidence
•	Single-sensor detections: lower confidence, flagged in glass box
•	Disabled sensors: fusion quality degrades visibly
◦	Narration: "[WARNING] Thermal offline — pedestrian detection confidence reduced 40%"
◦	Contribution bars show the gap; AI may make more mistakes
 6. Glass Box Visualization
Five visualization panels provide complete transparency into the AI's decision-making process:
Panel	What It Shows	Educational Purpose
Sensor Fusion Map	Top-down view, all detections merged, color-coded by source sensor, gaps visible when sensors disabled	Shows how multiple sensors create unified world model
Decision Tree	Live flowchart: Safety check → Utility scoring → Action selected, active path highlighted	Shows AI decision-making as a logical process
Confidence Meters	Per-object confidence bars, real-time updates, visibly drops when sensors disabled	Teaches that AI quantifies certainty
Sensor Contribution Bars	Per-detection: "Pedestrian: LiDAR 40% | Thermal 55% | Camera 5%"	Demonstrates sensor fusion value
Narration Log	Timestamped: detection → assessment → action → result, including errors	Makes AI reasoning readable
6.1 Playback Controls
•	Pause: freeze everything, inspect all panels
•	Slow-motion: 0.25x and 0.5x speed with all panels updating
•	Step-through: frame-by-frame advance
•	Rewind: scrub back through decision log
6.2 Sensor Toggle Experiment
Students can disable any sensor independently during Phase B. The AI continues driving with remaining sensors, and the glass box immediately shows the impact: fusion map gaps, confidence drops, contribution bar shifts, and narration explains the degradation in plain language. The AI may make mistakes it wouldn't normally make — a powerful teaching moment.
7. Game Flow (10-Minute Session)
Time	Phase	What Happens
0:00–0:10	Orientation	10-second overlay: controls and mission goal
0:10–4:30	Phase A: You Drive	Daylight → dusk → blackout → sensor-only driving
4:30–5:15	Break	2–3 multiple choice questions on screen
5:15–8:45	Phase B: AI Drives	Same seed, glass box open, watch/toggle/predict
8:45–9:30	Endscreen	Score comparison + key stats
7.1 Phase A: You Drive (Adaptive)
Students drive in a 1st-person cockpit view with functional dashboard and mirrors. All sensor panels are active as floating, draggable overlays. Daylight fades progressively from the start.
Blackout Trigger: When the student reaches their first waypoint, the blackout sequence begins:
1.	Sky shifts to deep dusk over ~15 seconds
2.	"⚠️ VISIBILITY DEGRADING" warning appears
3.	Screen darkens faster
4.	"⚠️ VISUAL SYSTEMS FAILING" warning
5.	Hard cut to black: "❌ VISUAL FEED OFFLINE — SENSOR NAVIGATION ACTIVE"
The sensor fusion map expands to replace the 3D view as the primary navigation tool. Phase A always ends at 4:30 — faster students earn more blind-driving time. The blind phase uses a 2x score multiplier.
7.2 Break: Quick Assessment (~45 sec)
•	"Which sensor was most useful after lights out?"
•	"What was the hardest obstacle to detect without vision?"
•	"Which sensor detected the emergency vehicle first?"
7.3 Phase B: AI Drives (~3.5 min)
The AI drives the exact same course (same seed, same obstacles) with the full glass box open. Students engage in three ways:
•	WATCH — observe the AI navigate with full transparency across all 5 panels
•	TOGGLE — disable sensors and see the AI degrade in real-time
•	PREDICT — prompted before key moments to predict the AI's action (scored on accuracy)
7.4 Endscreen (~45 sec)
Score comparison between student and AI on the same course. Key stats displayed: collisions, near-misses, waypoints completed, time, and Phase B prediction accuracy.
 8. Camera & HUD / UI
8.1 Camera
•	1st person cockpit view throughout Phase A
•	Functional dashboard with integrated speedometer
•	Working mirrors: left, center, right (tied to Camera/CV sensor data)
•	Lights out: cockpit goes dark, windshield black, mirrors show nothing
8.2 Always-On HUD
Element	Position	Purpose
Speedometer	Dashboard (integrated)	Current speed
Waypoint compass	Top center	Direction to next objective
Mini-map	Corner	Road layout only, no obstacles
Timer + phase	Top	Time remaining, current phase
Score	Top	Running point total
Collision counter	Top	Incidents this session
Sensor status	Corner	4 icons: green = active, red = off
8.3 Panel Management
All sensor panels and glass box panels are floating and draggable. Default positions are provided per phase, but students can rearrange freely. Panel positions are logged for research data (reveals which sensors students prioritize).
9. Scoring System
9.1 Phase A Scoring
Action	Points	Notes
Waypoint reached	+200	Core mission progress
Clean driving (per 10s)	+25	No incidents
Near-miss avoided	+50	Sensor awareness
Obeying traffic signal	+30	Rule comprehension
Yielding to emergency vehicle	+75	Audio awareness
Stopping for pedestrian/child	+100	Safety priority
BLIND PHASE MULTIPLIER	x2 all above	Rewards sensor-only skill
9.2 Phase B Scoring
Action	Points
Correct AI prediction	+150
Partially correct prediction	+75
Wrong prediction	+0 (no penalty)
Sensor toggle experiment	+25 each
10. Leaderboard
10.1 Categories
•	🏆 Best Driver — Highest Phase A total score
•	📡 Best Sensor Navigator — Highest blind-phase score (x2 portion only)
•	🧠 Best AI Predictor — Highest Phase B prediction accuracy
•	Overall total score ranking
10.2 Technical Implementation
•	Separate web page, auto-refreshes every 10 seconds
•	Displayed on TV/monitor in research room visible to all students
•	Configurable identity per session: real names, anonymous IDs, or gamertags
•	Animated new score entry (highlight, slide into position)
•	Current session leaderboard + optional all-time view
 11. Data Collection
11.1 Session Metadata
•	Session ID, random seed, timestamp, total duration
•	Phase A duration, blind phase duration, Phase B duration
•	Student identifier (configurable by researcher)
11.2 Continuous Sampling (every 0.5 seconds)
•	Car position (x, y, z), heading, speed, steering angle
•	Throttle / brake input values
•	Current visibility level (daylight → dusk → blind)
•	Active / disabled sensors
•	Weather state
•	Floating panel positions (where student placed each panel)
11.3 Event-Based Logging
Driving Events:
•	Waypoint reached (which waypoint, timestamp)
•	Collision (object type, speed at impact, which sensors had detected it, distance at first detection)
•	Near-miss (object, closest distance, which sensors detected it)
•	Red light run (timestamp, cross-traffic state)
•	Off-road / wrong-way events
•	Blackout triggered (timestamp, waypoint count at trigger)
Sensor Interaction Events:
•	Sensor panel dragged/repositioned (from position, to position, timestamp)
•	Sensor toggled on/off (which sensor, timestamp)
•	LiDAR density changed (from/to value, timestamp)
•	Thermal overlay toggled (timestamp)
Phase B Events:
•	Pause used (timestamp, duration)
•	Slow-motion / step-through used (timestamps, durations)
•	Sensor toggle experiments (which sensor, duration disabled, AI behavior change observed)
•	Prediction prompts (question shown, student answer, correct answer, response time)
AI Comparison Data:
•	Student path vs AI path (position arrays, same seed)
•	Student score vs AI score
•	Incidents student had that AI avoided (with AI's decision log for that moment)
•	Full AI decision/narration log for the entire run
11.4 Export Formats
•	JSON — Complete session log with every data point, fully replayable
•	CSV — Summary statistics, one row per student, key metric columns
•	Auto-saved at session end + manual export option for researchers
12. Target Research Questions
The data collection system is designed to support the following research questions:
•	Do students learn sensor concepts from gameplay? (Pre/post knowledge comparison)
•	How does driving behavior change when vision is removed? (Pre-blind vs post-blind driving data)
•	Does watching the AI drive improve student understanding of AI decision-making? (Phase B engagement + post-session assessment)
•	Can students explain how AI uses sensors to make decisions? (Qualitative assessment by research team)
•	How do students understand the AI concepts used in the game? What concepts can they explain by using the game? (Researcher-administered assessment, external to game)

— End of Architecture Document —
