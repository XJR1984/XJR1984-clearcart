/**
 * Render the REAL browser walkthrough into a captioned 1080p MP4.
 * This intentionally does not present any fabricated payment confirmation.
 */
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const dir = path.resolve('artifacts/clearcart-demo');
const audit = JSON.parse(await readFile(path.join(dir, 'browser-audit.json'), 'utf8'));
if (audit.paypalSandboxActualCaptureVerified !== false) {
  throw new Error('Unexpected claim of provider-side sandbox verification');
}
function exec(cmd,args){ execFileSync(cmd,args,{stdio:'inherit'}); }
for(const name of ['opening','architecture','closing']){
  exec('rsvg-convert', ['-w','1920','-h','1080', 'assets/demo/' + name + '.svg',
    '-o',path.join(dir,name+'.png')]);
}
const video = path.join(dir,audit.recordedVideo);
const ffprobe = JSON.parse(execFileSync('ffprobe',[
  '-v','error','-show_entries','format=duration:stream=width,height,codec_name,codec_type',
  '-of','json',video],{encoding:'utf8'}));
const browserDuration = Number(ffprobe.format.duration);
if(!Number.isFinite(browserDuration) || browserDuration<15 || browserDuration>150) {
  throw new Error('Unexpected raw footage duration: '+browserDuration);
}
const intro=7,arch=10,outro=7,finalDuration=intro+browserDuration+arch+outro;
if(finalDuration>=180) throw new Error('Hard video time limit violated: '+finalDuration);
const scenes = Object.fromEntries(audit.scenes.map(x=>[x.name,x.seconds]));
const clamp = n => Math.max(0,Math.min(browserDuration,Number(n)||0));
const t = n => {
  const h=Math.floor(n/3600), m=Math.floor((n%3600)/60), s=Math.floor(n%60), ms=Math.round((n%1)*1000);
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+','+String(ms).padStart(3,'0');
};
const cues=[
 [intro, intro+clamp(scenes.first_plan_visible),'Start with a real task and a spending limit.'],
 [intro+clamp(scenes.first_plan_visible), intro+clamp(scenes.owned_item),'The trained classifier and budget optimizer explain each choice.'],
 [intro+clamp(scenes.owned_item), intro+clamp(scenes.adjust_budget),'Already own an item? Exclude it and recalculate the plan.'],
 [intro+clamp(scenes.adjust_budget), intro+clamp(scenes.sandbox_setup),'Reduce your budget. The proposed cart stays within your limit.'],
 [intro+clamp(scenes.sandbox_setup), intro+browserDuration,'PayPal sandbox setup requires buyer approval. No payment is claimed here.']
].filter(x=>x[1]-x[0]>=0.35);
const srt=cues.map(([start,end,txt],i)=>(i+1)+'\n'+t(start)+' --> '+t(end)+'\n'+txt+'\n').join('\n');
await writeFile(path.join(dir,'editorial-captions.srt'),srt);
const final=path.join(dir,'ClearCart-Working-Demo-Candidate.mp4');
const srtFile=path.join(dir,'editorial-captions.srt');
const complex=[
  '[0:v]fps=30,scale=1920:1080,format=yuv420p,trim=duration=7,setpts=PTS-STARTPTS[v0]',
  '[1:v]fps=30,scale=1920:1080,drawbox=x=0:y=976:w=iw:h=104:color=0x090F1F@0.85:t=fill,format=yuv420p,setpts=PTS-STARTPTS[v1]',
  '[2:v]fps=30,scale=1920:1080,format=yuv420p,trim=duration=10,setpts=PTS-STARTPTS[v2]',
  '[3:v]fps=30,scale=1920:1080,format=yuv420p,trim=duration=7,setpts=PTS-STARTPTS[v3]',
  '[v0][v1][v2][v3]concat=n=4:v=1:a=0[cut]',
  "[cut]subtitles="+srtFile+":force_style='FontName=DejaVu Sans,FontSize=9,PrimaryColour=&H00F7F6EF&,OutlineColour=&H00000000&,BorderStyle=1,Outline=0,Shadow=0,MarginV=18,Alignment=2'[out]"
].join(';');
exec('ffmpeg',[
  '-hide_banner','-loglevel','warning','-y',
  '-loop','1','-framerate','30','-t','7','-i',path.join(dir,'opening.png'),
  '-i',video,
  '-loop','1','-framerate','30','-t','10','-i',path.join(dir,'architecture.png'),
  '-loop','1','-framerate','30','-t','7','-i',path.join(dir,'closing.png'),
  '-filter_complex',complex,'-map','[out]','-an',
  '-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p',
  '-movflags','+faststart',final
]);
const finalProbe = JSON.parse(execFileSync('ffprobe',[
  '-v','error','-show_entries','format=duration:stream=width,height,codec_name',
  '-of','json',final],{encoding:'utf8'}));
const finalActual=Number(finalProbe.format.duration);
if(!Number.isFinite(finalActual) || finalActual>=180) throw new Error('Rendered video is too long');
const bytes=await readFile(final);
const report={
  createdUTC:new Date().toISOString(),
  status:'RELEASE-CANDIDATE; NOT A COMPLETED PAYPAL SANDBOX END-TO-END VIDEO',
  videoFile:path.basename(final),sizeBytes:(await stat(final)).size,
  sha256:createHash('sha256').update(bytes).digest('hex'),
  durationSeconds:finalActual,width:1920,height:1080,hasVoiceover:false,
  burnedCaptions:true,audio:'silent; original on-screen story captions',
  realBrowserVideo:true,realPayPalSandboxCapture:false,
  formatProbe:finalProbe,sandboxPrecondition:'OWNER-SUPPLIED SANDBOX TEST ACCOUNT REQUIRED',
  publicYouTubeUploaded:false,devpostSubmissionComplete:false
};
await writeFile(path.join(dir,'render-release-report.json'),JSON.stringify(report,null,2)+'\n');
console.log('CLEARCART_VIDEO_REPORT='+JSON.stringify(report));
