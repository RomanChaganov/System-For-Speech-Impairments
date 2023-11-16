const recordButton = document.getElementById('record');
const stopButton = document.getElementById('stop');
const playButton = document.getElementById('play');

stopButton.disabled = true;
playButton.disabled = true;

const sendButton = document.getElementById('send');
const fileButton = document.getElementById('fileInput');
const loaderWrapper = document.querySelector('.loader-wrapper');
const loader = document.querySelector('.loader');
const textArea = document.getElementById('textarea');

const canvas = document.getElementById("canvas");
let canvasCtx = canvas.getContext("2d");
let requestId;
let audio;
let analyserNode;
let sourceNode;
let blob;
let url;
let file_upload = false;

function drawLine() {
    canvasCtx.strokeStyle = '#483D8B';
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, canvas.height / 2);
    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
}

drawLine();

function draw() {
    analyserNode.fftSize = 2048;
    sourceNode.connect(analyserNode);
    let dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    requestId = requestAnimationFrame(draw);
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    analyserNode.getByteFrequencyData(dataArray);
    let barWidth = canvas.width / 70;
    let barHeight;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
        barHeight = dataArray[i] / 2;
        if (barHeight < 1) { // Если нет звука, рисуем один пиксель
            barHeight = 1;
        }
        canvasCtx.fillStyle = `rgb(${barHeight * 1.3}, 100, 100)`;
        canvasCtx.fillRect(x, (canvas.height - barHeight) / 2, barWidth, barHeight);
        x += barWidth;
    }
}

function showLoader() {
    loaderWrapper.style.display = 'flex';
}

function hideLoader() {
    loaderWrapper.style.display = 'none';
}

function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

async function getMedia(constraints) {
    let stream = null;

    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("Микрофон инициализирован!!!");
    } catch(err) {
        alert("Ошибка инициализации записывающего устройства!");
    }

    if (stream == null) { return; }

    let audioContext = new AudioContext();
    let mediaRecorder = new MediaRecorder(stream);
    let chunks = [];

    recordButton.addEventListener('click', function() {
        recordButton.disabled = true;
        playButton.disabled = true;
        stopButton.disabled = false;

        mediaRecorder.start();
        cancelAnimationFrame(requestId);
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        audio = undefined;
        sourceNode = audioContext.createMediaStreamSource(stream);
        analyserNode = audioContext.createAnalyser();
        draw();
    });

    stopButton.addEventListener('click', function() {
        recordButton.disabled = false;
        playButton.disabled = false;
        stopButton.disabled = true;

        if (audio !== undefined) {
            audio.pause()
        } else {
            mediaRecorder.stop();
        }

        cancelAnimationFrame(requestId);
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        drawLine();
    });

    mediaRecorder.addEventListener('dataavailable', function(event) {
        chunks.push(event.data);
    });

    mediaRecorder.addEventListener('stop', function() {
        blob = new Blob(chunks, { type: 'audio/wav' });
        url = URL.createObjectURL(blob);
        chunks = [];
    });

    playButton.addEventListener('click', function() {
        if (file_upload) {
            url = URL.createObjectURL(fileButton.files[0]);
            file_upload = false;
        }

        if (url === undefined) { return; }

        recordButton.disabled = true;
        playButton.disabled = true;
        stopButton.disabled = false;

        audio = new Audio();
        audio.addEventListener('play', function() {
            sourceNode = audioContext.createMediaElementSource(audio);
            analyserNode = audioContext.createAnalyser();
            sourceNode.connect(analyserNode);
            analyserNode.connect(audioContext.destination);
            draw();
        });
        audio.addEventListener('ended', function() {
            recordButton.disabled = false;
            playButton.disabled = false;
            stopButton.disabled = true;

            cancelAnimationFrame(requestId);
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            audio = undefined;
            drawLine();
        });

        audio.src = url;
        audio.play();
    });

    fileButton.addEventListener('click', function() {
        playButton.disabled = false;
        file_upload = true;
    });

    sendButton.addEventListener('click', function() {
        let sources = document.getElementsByName('source');
        let genders = document.getElementsByName('gender');
        let sourceType;
        let genderType;

        for (let i = 0; i < 2; i++) {
            if (sources[i].checked) sourceType = sources[i].value;
            if (genders[i].checked) genderType = genders[i].value;
        }

        if (sourceType === "file" && fileButton.files[0] === undefined) {
            alert("Выберите файл для распознавания!");
            return;
        }

        if (sourceType === "record" && blob === undefined) {
            alert("Чтобы распознать, сначала запишите речь!");
            return;
        }

        showLoader();

        let request = new XMLHttpRequest();
        request.overrideMimeType('text/plain');
        let fd = new FormData();
        let randomID = Math.trunc(getRandomNumber(1, 1000));
        console.log(randomID)

        if (sourceType != "file") {
            fd.append('file', blob);
        } else {
            fd.append("file", fileButton.files[0]);
        }

        fd.append("gender", genderType)
        fd.append("ID", randomID);

        request.onload = function() {
            if (request.status != 200) {
                hideLoader();
                alert("Произошла ошибка!");
            } else {
//                textArea.value = request.responseText;
                playButton.disabled = false;
                var blob = request.response;
                url = URL.createObjectURL(blob);

                var xhr = new XMLHttpRequest();
                fd = new FormData();
                fd.append("ID", randomID);

                xhr.onload = function() {
                    if (request.status != 200) {
                        hideLoader();
                        alert("Произошла ошибка!");
                    } else {
                        hideLoader();
                        textArea.value = xhr.responseText;
                        alert("Синтезированный голос готов!");
                    }
                }

                xhr.responseType = 'text';
                xhr.open("POST", "/upload_text");
                xhr.send(fd);
            }
        }

        request.onerror = function() {
            hideLoader();
            alert("Ошибка соединения");
        }

        request.responseType = 'blob';
        request.open("POST", "/upload");
        request.send(fd);
    });
}

getMedia({ audio: true });