const recordButton = document.getElementById('record');
const playButton = document.getElementById('play');
var class_timer = document.getElementById('timer');
var canvas = document.getElementById('canvas');
var canvasCtx = canvas.getContext('2d');
var sourceNode;
var analyserNode;
var sec = 0;
var min = 0;
var hrs = 0;
var t;
var requestId;
let url;
var pause;
var audio;

function tick(){
    sec++;
    if (sec >= 60) {
        sec = 0;
        min++;
        if (min >= 60) {
            min = 0;
            hrs++;
        }
    }
}

function add() {
    tick();
    class_timer.textContent = (hrs > 9 ? hrs : "0" + hrs)
        	 + ":" + (min > 9 ? min : "0" + min)
       		 + ":" + (sec > 9 ? sec : "0" + sec);
    timer();
}

function timer() {
    t = setTimeout(add, 1000);
}

function draw() {
    analyserNode.fftSize = 2048;
    // analyserNode.connect(audioContext.destination);
    sourceNode.connect(analyserNode);
    var dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      // Подготавливаем canvas для очередного кадра
    requestId = requestAnimationFrame(draw);
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      // Получаем данные о звуке
    analyserNode.getByteFrequencyData(dataArray);
      // Рисуем столбцы визуализации
    var barWidth = canvas.width / 150;
    var barHeight;
    var x = 0;
    for (var i = 0; i < dataArray.length; i++) {
        barHeight = dataArray[i] / 2;
        if (barHeight < 1) { // Если нет звука, рисуем один пиксель
            barHeight = 1;
        }
        canvasCtx.fillStyle = `rgb(${barHeight * 1.3},175,80)`;
        canvasCtx.fillRect(x, (canvas.height - barHeight) / 2, barWidth, barHeight);
        x += barWidth;
      }
    }


navigator.mediaDevices.getUserMedia({ audio: true })
  .then(function(stream) {
    var audioContext = new AudioContext();
    // analyserNode.fftSize = 2048;
    // sourceNode.connect(analyserNode);
    // // analyserNode.connect(audioContext.destination);
    // var dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    // Запускаем визуализацию
    // Создаем MediaRecorder для записи звука
    var mediaRecorder = new MediaRecorder(stream);
    // Создаем массив для хранения записанного звука
    var chunks = [];
    // Начинаем запись при нажатии на кнопку
    document.getElementById('record').addEventListener('click', function() {
      if (mediaRecorder.state === 'inactive') {
                class_timer.textContent = "00:00:00";
                timer();
                recordButton.id = "stop"
                mediaRecorder.start();
                recordButton.textContent = 'Остановить запись ⏹️';
                sourceNode = audioContext.createMediaStreamSource(stream);
                analyserNode = audioContext.createAnalyser();
                draw();
            } else {
                recordButton.id = "record"
                mediaRecorder.stop();
                chunks = []
                clearTimeout(t);
                sec = 0; min = 0; hrs = 0;
                recordButton.textContent = 'Записать голос ▶️';
                cancelAnimationFrame(requestId)
                canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            }
    });

    mediaRecorder.addEventListener('dataavailable', function(event) {
      chunks.push(event.data);
    });

    mediaRecorder.addEventListener('stop', function() {
      // Создаем Blob из массива записанных данных
      var blob = new Blob(chunks, { type: 'audio/wav' });
      // Создаем ссылку на Blob
      url = URL.createObjectURL(blob);
      // Воспроизводим записанный звук
      // var xhr = new XMLHttpRequest();
            // xhr.open('POST', '/upload-audio', true);
            // xhr.setRequestHeader('Content-Type', 'application/octet-stream');
            // xhr.onreadystatechange = function() {
            //     if (xhr.readyState === 4 && xhr.status === 200) {
            //         console.log('Audio uploaded successfully');
            //     }
            // };
            // xhr.send(blob);
    });

//     function loadSound(url) {
//   var request = new XMLHttpRequest();
//   request.open('GET', url, true);
//   request.responseType = 'arraybuffer';
//   request.onload = function() {
//     audioCtx.decodeAudioData(request.response, function(buffer) {
//       audioBuffer = buffer;
//     });
//   };
//   request.send();
// }

    document.getElementById('play').addEventListener('click', function() {
        if (url === undefined) {
            return;
        }

        if (audio !== undefined && !pause) {
            pause = true;
            audio.pause()
            return
        }

        if (audio !== undefined && pause) {
            pause = false;
            audio.play()
            return
        }

        audio = new Audio();
        pause = false;
        audio.addEventListener('play', function() {
            playButton.id = "playing"
            playButton.textContent = "Проигрывается..."
            sourceNode = audioContext.createMediaElementSource(audio);
            analyserNode = audioContext.createAnalyser();
            sourceNode.connect(analyserNode);
            analyserNode.connect(audioContext.destination);
            draw();
        });
        audio.addEventListener('ended', function() {
            playButton.id = "play"
            playButton.textContent = "Воспроизвести"
            cancelAnimationFrame(requestId);
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            audio = undefined
        });
        audio.addEventListener('pause', function() {
               playButton.textContent = "Продолжить"
               playButton.id = "pause"
        });
        audio.src = url;
        audio.play();
    });
        // Обрабатываем данные после остановки записи
  })
  .catch(function(error) {
    console.log('Error:', error);
  });
