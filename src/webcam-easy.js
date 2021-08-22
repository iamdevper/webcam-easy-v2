export default class Webcam {
  constructor(webcamElement, facingMode = 'user', canvasElement = null, snapSoundElement = null) {
    this._webcamElement = webcamElement;
    this._webcamElement.width = this._webcamElement.width || 640;
    this._webcamElement.height = this._webcamElement.height || this._webcamElement.width * (3 / 4);
    this._facingMode = facingMode;
    this._webcamList = [];
    this._streamList = [];
    this._selectedDeviceId = '';
    this._canvasElement = canvasElement;
    this._snapSoundElement = snapSoundElement;
  }

  get facingMode() {
    return this._facingMode;
  }

  set facingMode(value) {
    this._facingMode = value;
  }

  get webcamList() {
    return this._webcamList;
  }

  get webcamCount() {
    return this._webcamList.length;
  }

  get selectedDeviceId() {
    return this._selectedDeviceId;
  }

  /* Get all video input devices info */
  getVideoInputs(mediaDevices) {
    this._webcamList = [];
    mediaDevices.forEach(mediaDevice => {
      if (mediaDevice.kind === 'videoinput') {
        this._webcamList.push(mediaDevice);
      }
    });
    if (this._webcamList.length == 1) {
      this._facingMode = 'user';
    }
    return this._webcamList;
  }

  /* Get media constraints */
  getMediaConstraints() {
    var videoConstraints = {};
    if (this._selectedDeviceId == '') {
      videoConstraints.facingMode = this._facingMode;
    } else {
      videoConstraints.deviceId = { exact: this._selectedDeviceId };
    }
    var constraints = {
      video: videoConstraints,
      audio: false
    };
    return constraints;
  }

  /* Select camera based on facingMode */
  selectCamera() {

    for (let webcam of this._webcamList) {

      console.log('_facingMode:', this._facingMode)
      console.log('webcam:', webcam)

      if (
        (
          this._facingMode === 'user'
          && (webcam.label.toLowerCase().includes('front')
            || webcam.label.toLowerCase().includes('หน้า')
          ))
        || (
          this._facingMode === 'enviroment'
          && (webcam.label.toLowerCase().includes('back')
            || webcam.label.toLowerCase().includes('หลัง')
          ))
      ) {
        this._selectedDeviceId = webcam.deviceId;
      } else {
        this._selectedDeviceId = webcam.deviceId;
      }
      // console.log('_selectedDeviceId:', this._selectedDeviceId)

    }
    return this._selectedDeviceId;
  }

  /* Change Facing mode and selected camera */
  flip() {
    this._facingMode = (this._facingMode == 'user') ? 'enviroment' : 'user';
    this._webcamElement.style.transform = "";
    this.selectCamera();
  }

  /*
    1. Get permission from user
    2. Get all video input devices info
    3. Select camera based on facingMode 
    4. Start stream
  */
  async start(startStream = true) {
    return await new Promise((resolve, reject) => {

      this.stop();

      navigator.getUserMedia = (navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia);

      if (navigator.getUserMedia) {
        navigator.mediaDevices.getUserMedia(this.getMediaConstraints()) //get permisson from user
          .then(stream => {
            console.log(stream);
            this._streamList.push(stream);
            this.info() //get all video input devices info
              .then(webcams => {
                this.selectCamera();   //select camera based on facingMode
                if (startStream) {
                  this.stream()
                    .then(facingMode => {
                      resolve(this._facingMode);
                    })
                    .catch(error => {
                      reject(error);
                    });
                } else {
                  resolve(this._selectedDeviceId);
                }
              })
              .catch(error => {
                reject(error);
              });
          })
          .catch(error => {
            reject(error);
          });
      } else {
        console.log("getUserMedia not supported");
      }

    });
  }

  /* Get all video input devices info */
  async info() {
    return new Promise((resolve, reject) => {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          this.getVideoInputs(devices);
          resolve(this._webcamList);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  /* Start streaming webcam to video element */
  async stream() {
    return await new Promise((resolve, reject) => {
      navigator.mediaDevices
        .getUserMedia(this.getMediaConstraints())
        .then(stream => {

          // if (window.webkitURL) {
          //   this._webcamElement.src = window.webkitURL.createObjectURL(stream);
          //   localMediaStream = stream;
          // } else if (this._webcamElement.mozSrcObject !== undefined) {
          //   this._webcamElement.mozSrcObject = stream;
          // } else if (this._webcamElement.srcObject !== undefined) {
          //   this._webcamElement.srcObject = stream;
          // } else {
          //   this._webcamElement.src = stream;
          // }

          this._streamList.push(stream);
          this._webcamElement.srcObject = stream;

          // front camera
          if (this._facingMode === 'user') {
            this._webcamElement.style.transform = "scale(-1,1)";
          }
          this._webcamElement.play();
          resolve(this._facingMode);

        })
        .catch(error => {
          console.log(error);
          reject(error);
        });
    });
  }

  /* Stop streaming webcam */
  stop() {
    this._streamList.forEach(stream => {

      stream.getVideoTracks().forEach(track => {
        const capabilities = track.getCapabilities();
        // console.log("Track capabilities: " + JSON.stringify(capabilities));
        const settings = track.getSettings();
        // console.log("Track settings: " + JSON.stringify(settings));
        track.stop();
      })

      stream.getTracks().forEach(track => {
        track.stop();
      });

    });
  }

  snap() {
    if (this._canvasElement != null) {
      if (this._snapSoundElement != null) {
        this._snapSoundElement.play();
      }
      this._canvasElement.height = this._webcamElement.scrollHeight;
      this._canvasElement.width = this._webcamElement.scrollWidth;
      let context = this._canvasElement.getContext('2d');
      if (this._facingMode == 'user') {
        context.translate(this._canvasElement.width, 0);
        context.scale(-1, 1);
      }
      context.clearRect(0, 0, this._canvasElement.width, this._canvasElement.height);
      context.drawImage(this._webcamElement, 0, 0, this._canvasElement.width, this._canvasElement.height);
      let data = this._canvasElement.toDataURL('image/png');
      return data;
    }
    else {
      throw "canvas element is missing";
    }
  }
}
