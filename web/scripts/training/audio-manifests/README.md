# Training narration manifests

`generate-training-aivis-audio.py` writes one manifest per course here. Each
manifest binds the narration hash, the local AivisSpeech profile, synthesis
parameters, duration, and final MP3 hash. They are build evidence and resume
state; they are intentionally kept outside `public/` so they are not shipped
as website assets.
