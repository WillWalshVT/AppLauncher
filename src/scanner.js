import jsQR from 'jsqr';
export async function scanQR({video,onCode,onError}){
 if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera scanning needs HTTPS and camera access. Paste the invitation link instead.');
 const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false});
 let running=true,timer;const canvas=document.createElement('canvas');const context=canvas.getContext('2d',{willReadFrequently:true});
 video.srcObject=stream;video.muted=true;video.playsInline=true;
 const stop=()=>{running=false;clearTimeout(timer);stream.getTracks().forEach(t=>t.stop());video.srcObject=null;};
 try{await video.play();}catch(error){stop();throw error;}
 const read=()=>{if(!running)return;try{if(video.readyState>=2){const width=Math.min(video.videoWidth,800);canvas.width=width;canvas.height=video.videoHeight*width/video.videoWidth;context.drawImage(video,0,0,canvas.width,canvas.height);const frame=context.getImageData(0,0,canvas.width,canvas.height);const result=jsQR(frame.data,frame.width,frame.height,{inversionAttempts:'dontInvert'});if(result){stop();onCode(result.data);return;}}timer=setTimeout(read,160);}catch(error){stop();onError?.(error);}};
 read();return stop;
}
