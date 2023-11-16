import io
import os
import uuid

import librosa
import torch
import torch.nn as nn
from flask import Flask, render_template, request, send_file
import torch.nn.functional as F


# from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor


ID_text = {}


@app.route('/')
def index():
    return render_template("index.html")


@app.route('/about')
def about():
    return render_template("about.html")


@app.route('/project')
def project():
    return render_template("project.html")


# def predict(speech_array, sampling_rate):
#     inputs = processor(speech_array, sampling_rate=sampling_rate, return_tensors="pt", padding=True)
#     with torch.no_grad():
#         logits = model(inputs.input_values.to(device)).logits
#     pred_ids = torch.argmax(logits, dim=-1)
#     input_sequences = [processor.batch_decode(pred_ids)[0]]
#     return input_sequences[0]


def synthesis(text, man=True):
    if man:
        speaker = 'aidar'
    else:
        speaker = 'baya'

    filename = str(uuid.uuid4()) + '.wav'
    synt_model.save_wav(text=text, speaker=speaker, sample_rate=sample_rate, audio_path=filename)
    return filename


@app.route('/upload', methods=['POST'])
def upload():
    gender = request.form.get('gender')
    file = request.files.get('file')
    ID = request.form.get('ID')
    print(ID)

    if file:
        tmp = io.BytesIO(file.read())
        y, sr = librosa.load(tmp, sr=16000)
        text = predict(model, y, device)
        ID_text[ID] = text
        filename = synthesis(text, gender == "man")
        with open(filename, 'rb') as f:
            file_content = f.read()
        file_stream = io.BytesIO(file_content)
        os.remove(filename)
        return send_file(file_stream, as_attachment=True, mimetype='blob', download_name="audio.wav")

    return "Данные отсутствуют или повреждены"


@app.route('/upload_text', methods=['POST'])
def upload_text():
    ID = request.form.get('ID')
    print(ID)

    if ID:
        try:
            text = ID_text[ID]
            del (ID_text[ID])
            return str(text)
        except:
            return "Отсутствие данных"

    return "Данные отсутствуют или повреждены"


if __name__ == '__main__':
    app.run()
