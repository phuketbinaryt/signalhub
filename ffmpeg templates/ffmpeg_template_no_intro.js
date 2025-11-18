// Get image links as array
const imageLinksRaw = $("Summarize").all()[0].json.concatenated_data_attributes_source;
const imagesArray = Array.isArray(imageLinksRaw) 
    ? imageLinksRaw 
    : imageLinksRaw.split('\n').map(link => link.trim()).filter(Boolean);

// Get video links as array
const videoLinksRaw = $("Summarize4").all()[0].json.concatenated_video_url;
const videosArray = Array.isArray(videoLinksRaw) 
    ? videoLinksRaw 
    : videoLinksRaw.split('\n').map(link => link.trim()).filter(Boolean);

// Audio duration and input
const audioSrc = $("Google Drive14").first().json.webContentLink;
const audioDurationSeconds = $("Get Audio Duration5").all()[0].json.durationSeconds;

// Video duration calculation - assume each video is 5 seconds (or get from metadata)
const videoDurationSeconds = 5; // This could be made dynamic if video durations are available
const totalVideoDuration = videosArray.length * videoDurationSeconds;

// Calculate remaining time for images after accounting for video durations
const remainingTimeForImages = audioDurationSeconds - totalVideoDuration;
const imageDurationPerItem = imagesArray.length > 0 ? remainingTimeForImages / imagesArray.length : 0;

// Calculate exact duration for last image to ensure perfect audio-video sync
const usedImageDuration = imageDurationPerItem * (imagesArray.length - 1);
const lastImageDuration = remainingTimeForImages - usedImageDuration;

// Total content items for concat operation
const totalContentItems = videosArray.length + imagesArray.length;

// Build input_files object
const input_files = {};

// Add video inputs
videosArray.forEach((video, idx) => {
  input_files[`in_video_${idx+1}`] = video;
});

// Add image inputs
imagesArray.forEach((img, idx) => {
  input_files[`in_img_${idx+1}`] = img;
});

input_files["in_audio_1"] = audioSrc;
input_files["in_overlay"] = "http://37.27.16.153/HIVXVYTu/smalloverlay.mp4";
input_files["in_srt_shifted"] = $('Subtitle Drive').first().json.webContentLink;

// Output files
const output_files = {
  "out_1": "output.mp4"
};

// Build FFmpeg command with optimizations
let ffmpeg_command = ``;

// Add video inputs without duration limiting (use natural video duration)
videosArray.forEach((video, idx) => {
  ffmpeg_command += `-i {{in_video_${idx+1}}} `;
});

// Add image inputs with calculated durations
imagesArray.forEach((img, idx) => {
  const isLastImage = idx === imagesArray.length - 1;
  const imageDuration = isLastImage ? lastImageDuration : imageDurationPerItem;
  ffmpeg_command += `-loop 1 -t ${imageDuration} -i {{in_img_${idx+1}}} `;
});

// Calculate total video duration for overlay looping
const totalVideoDurationForOverlay = audioDurationSeconds;
ffmpeg_command += `-i {{in_audio_1}} -stream_loop -1 -t ${totalVideoDurationForOverlay} -i {{in_overlay}} `;

// Start filter_complex with optimizations
ffmpeg_command += `-filter_complex "`;

// Step 1: Process videos - ultra-fast scaling
const videoStartIndex = 0;
for (let i = 0; i < videosArray.length; i++) {
  const inputIndex = videoStartIndex + i;
  ffmpeg_command += `[${inputIndex}:v]scale=1280:720:flags=neighbor,fps=25,setpts=PTS-STARTPTS[video${i+1}];`
}

// Step 2: Process images - minimal processing for static images
const imageStartIndex = videoStartIndex + videosArray.length;
for (let i = 0; i < imagesArray.length; i++) {
  const inputIndex = imageStartIndex + i;
  ffmpeg_command += `[${inputIndex}:v]setpts=PTS-STARTPTS[img${i+1}];`
}

// Step 3: Concatenate all content in one operation
let concatInputs = '';
for (let i = 1; i <= videosArray.length; i++) {
  concatInputs += `[video${i}]`;
}
for (let i = 1; i <= imagesArray.length; i++) {
  concatInputs += `[img${i}]`;
}
ffmpeg_command += `${concatInputs}concat=n=${totalContentItems}:v=1:a=0[mainv];`;

// Step 4: Overlay - ultra-optimized for speed
const audioInputIndex = imageStartIndex + imagesArray.length;
const overlayInputIndex = audioInputIndex + 1;
ffmpeg_command += `[${overlayInputIndex}:v]scale=1280:720:flags=neighbor,format=rgba,colorchannelmixer=aa=0.2[overlay];`
ffmpeg_command += `[mainv][overlay]overlay[with_overlay];`

// Step 5: Subtitles
ffmpeg_command += `[with_overlay]subtitles={{in_srt_shifted}}:charenc=UTF-8:force_style='FontName=Arial,FontSize=20'[final];`

// Step 6: Audio processing
ffmpeg_command += `[${audioInputIndex}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[aout]" `;

// Output map with extreme speed optimization
ffmpeg_command += `-map [final] -map [aout] -s 1280x720 -c:v libx264 -preset ultrafast -crf 18 -c:a aac -b:a 128k -ar 48000 -threads 32 -tune zerolatency -movflags +faststart {{out_1}}`;

return [{
  json: {
    input_files,
    output_files,
    ffmpeg_command,
    vcpu_count: 32,
    max_command_run_seconds: 1200  // Increased timeout
  }
}];