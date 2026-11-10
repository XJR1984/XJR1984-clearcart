"""Produce a timed original neural narration using Piper's en_GB-cori-high voice.
The underlying LibriVox training recordings are public domain, per Piper's model card.
This is a controlled narration asset. It is not a payment simulation.
"""
from pathlib import Path
import io, wave, json, subprocess, hashlib
from piper import PiperVoice, SynthesisConfig

ROOT=Path("artifacts/clearcart-commercial")
ROOT.mkdir(parents=True,exist_ok=True)
MODEL=Path(".voice_models/en_GB-cori-high.onnx")
VOICE=PiperVoice.load(str(MODEL))
SLOTS=[
  (1.1, 9.5, "What if shopping didn't start with a product search... but with what you actually need?"),
  (10.8, 19.8, "Meet ClearCart. One everyday goal. One clear budget. And a plan that makes sense."),
  (21.0, 33.6, "A small trained AI model recognizes your task. Then a budget optimizer builds a cart with a reason behind every item."),
  (34.8, 43.6, "For a first kitchen, a seventy-five-dollar budget becomes a forty-four ninety-four plan."),
  (44.8, 56.4, "Already own the frying pan? Tell ClearCart. Your plan changes, so you're not shopping for what you already have."),
  (57.3, 64.5, "Lower the limit to forty-five dollars. The recalculated cart still fits."),
  (65.9, 77.0, "And the PayPal sandbox flow is built around a choice. The buyer reviews and approves the order. Nothing purchases itself."),
  (77.8, 88.0, "ClearCart is a working prototype with illustrative products. A real PayPal sandbox capture is still awaiting verification."),
  (88.5, 96.0, "ClearCart. Your need. Your limit. Your call.")
]
def cmd(*args):
    subprocess.run(args,check=True,stdout=subprocess.DEVNULL)
sources=[]
for i,(start,end,line) in enumerate(SLOTS):
    fname=ROOT/f"narration_{i+1:02d}.wav"
    config=SynthesisConfig(length_scale=1.05,noise_scale=0.72,noise_w_scale=0.77,normalize_audio=True)
    with wave.open(str(fname),"wb") as fout:
        VOICE.synthesize_wav(line,fout,syn_config=config)
    dur=float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1",str(fname)],text=True))
    window=end-start-0.25
    # Keep the voice conversational; gently tempo-adjust only when a sentence would overrun.
    tempo=max(1.0,dur/window)
    sources.append((fname, start, end, line, round(dur,2),round(tempo,3)))
inputs=[]
filters=[]
for i,(fname,start,end,line,dur,tempo) in enumerate(sources):
    inputs+=["-i",str(fname)]
    filters.append(f"[{i}:a]aresample=48000,atempo={tempo:.5f},highpass=f=85,lowpass=f=11500,volume=1.0,adelay={int(start*1000)}|{int(start*1000)}[a{i}]")
refs=''.join(f"[a{i}]" for i in range(len(sources)))
filters.append(f"{refs}amix=inputs={len(sources)}:duration=longest:normalize=0,apad=pad_dur=3,atrim=duration=96,alimiter=limit=0.90,aresample=48000[out]")
output=ROOT/"ClearCart-Neural-Voiceover-96s.wav"
cmd("ffmpeg","-y","-hide_banner","-loglevel","error",*inputs,"-filter_complex",";".join(filters),"-map","[out]","-ac","1","-c:a","pcm_s16le",str(output))
manifest={"voice":"Piper en_GB-cori-high","model_training_data":"LibriVox public-domain recordings","model_card":"https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_GB/cori/high/MODEL_CARD","duration":96,"segments":[{"start":a,"end":b,"text":txt,"sourceSeconds":d,"tempo":tempo} for _,a,b,txt,d,tempo in sources],"sha256":hashlib.sha256(output.read_bytes()).hexdigest(),"genuine_paypal_capture_verified":False}
(ROOT/"narration-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
print(json.dumps(manifest,indent=2))
