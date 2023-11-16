const recordButton = document.getElementById('record');
const recognButton = document.getElementById('recogn');
const playButton = document.getElementById('play');
const upload = document.getElementById('upload');
const input = document.querySelector('.input-file input[type=file]');

const timer = document.getElementById('timer');
let interval;
let seconds = 0, minutes = 0, hours = 0;

const canvas = document.getElementById("canvas");
let canvasCtx = canvas.getContext("2d");

let analyserNode;
let sourceNode;
let requestId;

let url;
let audio;
let pause;
let blob;

const loaderWrapper = document.querySelector('.loader-wrapper');
const loader = document.querySelector('.loader');

function startTimer() {
  interval = setInterval(function() {
   seconds++;
   if (seconds == 60) {
    seconds = 0;
    minutes++;
    if (minutes == 60) {
     minutes = 0;
     hours++;
    }
   }
   timer.innerHTML = (hours ? (hours > 9 ? hours : "0" + hours) : "00") + ":" + (minutes ? (minutes > 9 ? minutes : "0" + minutes) : "00") + ":" + (seconds > 9 ? seconds : "0" + seconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(interval);
}

function resetTimer() {
  clearInterval(interval);
  seconds = 0;
  minutes = 0;
  hours = 0;
  timer.innerHTML = "00:00:00";
}

function showLoader() {
  loaderWrapper.style.display = 'flex';
}

function hideLoader() {
  loaderWrapper.style.display = 'none';
}

function draw() {
  analyserNode.fftSize = 2048;
  sourceNode.connect(analyserNode);
  let dataArray = new Uint8Array(analyserNode.frequencyBinCount);
  requestId = requestAnimationFrame(draw);
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  analyserNode.getByteFrequencyData(dataArray);
  let barWidth = canvas.width / 150;
  let barHeight;
  let x = 0;
  for (let i = 0; i < dataArray.length; i++) {
    barHeight = dataArray[i] / 2;
    if (barHeight < 1) { // Если нет звука, рисуем один пиксель
      barHeight = 1;
    }
    canvasCtx.fillStyle = `rgb(${barHeight * 1.3},175,80)`;
    canvasCtx.fillRect(x, (canvas.height - barHeight) / 2, barWidth, barHeight);
    x += barWidth;
  }
}

function sendVoice(form) {
  let request = new XMLHttpRequest();
  request.overrideMimeType('text/plain');

  request.onload = function() {
    if (request.status != 200) {
      hideLoader();
      alert("Не приняли!");
    } else {
      hideLoader();
      alert(request.responseText);
    }
  }

  request.open("POST", "/upload-audio");
  request.send(form);
}


async function getMedia(constraints) {
  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log("Микрофон инициализирован!!!");
  } catch(err) {
    alert("Ошибка инициализации записывающего устройства!");
  }

  if (stream == null) {
    return;
  }

  let audioContext = new AudioContext();
  let mediaRecorder = new MediaRecorder(stream);
  let chunks = [];

  recordButton.addEventListener('click', function() {
    if (mediaRecorder.state != 'inactive') {
      recordButton.style.backgroundColor = "#FF0000";
      recordButton.textContent = "Запись";
      mediaRecorder.stop();
      stopTimer();
      cancelAnimationFrame(requestId);
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      playButton.disabled = false;
      playButton.style.cursor = "pointer";
      return;
    }

    recordButton.style.backgroundColor = "#0000FF";
    recordButton.textContent = "Остановить";
    resetTimer();
    startTimer();
    mediaRecorder.start();
    cancelAnimationFrame(requestId);
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    playButton.disabled = true;
    playButton.style.cursor = "default";

    audio = undefined;
    sourceNode = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    draw();
  });

  mediaRecorder.addEventListener('dataavailable', function(event) {
    chunks.push(event.data);
  });

  mediaRecorder.addEventListener('stop', function() {
    blob = new Blob(chunks, { type: 'audio/wav' });
    url = URL.createObjectURL(blob);
    chunks = [];
  });

  recognButton.addEventListener('click', function() {
    let fd = new FormData();
    fd.append('voice', blob);
    sendVoice(fd);
    showLoader();
  });

  playButton.addEventListener('click', function() {
    if (url === undefined) {
      return;
    }

    if (audio !== undefined && !pause) {
      recordButton.disabled = false;
      recordButton.style.cursor = "pointer";
      pause = true;
      audio.pause()
      return
    }

    if (audio !== undefined && pause) {
      recordButton.disabled = true;
      recordButton.style.cursor = "default";
      pause = false;
      audio.play()
      return
    }

    audio = new Audio();
    pause = false;

    recordButton.disabled = true;
    recordButton.style.cursor = "default";

    audio.addEventListener('play', function() {
      playButton.textContent = "Пауза";
      sourceNode = audioContext.createMediaElementSource(audio);
      analyserNode = audioContext.createAnalyser();
      sourceNode.connect(analyserNode);
      analyserNode.connect(audioContext.destination);
      draw();
    });

    audio.addEventListener('ended', function() {
      recordButton.disabled = false;
      recordButton.style.cursor = "pointer";

      playButton.textContent = "Прослушать";
      cancelAnimationFrame(requestId);
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      audio = undefined;
    });

    audio.addEventListener('pause', function() {
      playButton.textContent = "Продолжить";
    });

    audio.src = url;
    audio.play();
  });

  upload.addEventListener('click', function() {
    let file = input.files[0];
    console.log(file);

    let formData = new FormData();
    formData.append("file", file);

    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/upload_wav", true);

    xhr.onload = function() {
      if (xhr.status === 200) {
        alert(xhr.responseText);
      }
    }

    xhr.send(formData);
    console.log("Файл отправлен!");
  });

  input.addEventListener('change', function() {
     var file = this.files[0];
     alert(file.name);
  });
}

getMedia({ audio: true });
