// Check barcode detector
if (!("BarcodeDetector" in window)) {
    alert("このブラウザは Barcode Detector をサポートしていません");
}

const detector = new (window as any).BarcodeDetector({
    formats: ["codabar"]
});
if (!detector) {
    alert("このブラウザは Barcode Detector をサポートしていません");
}


interface Item {
  id: string;
  timestamp: string;
}


// 学籍番号を取得する正規表現
// （codabarのスタート、ストップ文字に挟まれた6桁の数字）
const matchStr = /^[A-D](\d{6})[A-D]$/;


// initial setting for global variables
let stream: MediaStream | null = null;
let scanning: boolean = false;
let dataArr: Item[] = [];
let lastText: string = "";
const storageNameData = "ReadBarcode";



///////////////////////////////////////
// elements
///////////////////////////////////////

// div
const elemDivInitial = <HTMLElement>document.getElementById("initial")!;
const elemDivScan = <HTMLElement>document.getElementById("scan")!;

// initial
const elemHeader = <HTMLElement>document.getElementById("header")!;
const elemScanBtn = <HTMLInputElement>document.getElementById("scan-btn")!;
const elemClearBtn = <HTMLInputElement>document.getElementById("clear-btn")!;

// scan
const elemStartBtn = <HTMLInputElement>document.getElementById("start-btn")!;
const elemBackBtn = <HTMLInputElement>document.getElementById("back-btn")!;
const elemVideo = <HTMLVideoElement>document.getElementById("video")!;

// result (item number and list)
const elemItemNumber = <HTMLElement>document.getElementById("item-number")!;
const elemResultList = <HTMLElement>document.getElementById("result-list")!;



///////////////////////////////////////
// set callback functions to elements
///////////////////////////////////////
elemScanBtn.addEventListener("click", callbackScanBtn);
elemClearBtn.addEventListener("click", callbackClearBtn);

elemStartBtn.addEventListener("click", callbackStartBtn);
elemBackBtn.addEventListener("click", callbackBackBtn);



///////////////////////////////////////
// change state of UI
///////////////////////////////////////
function setUIState(state: string): void {
    if (state === "initial") {
        // initial
        elemDivInitial.style.display = "block";
        elemHeader.style.display = "block";
        elemScanBtn.style.display = "block";
        elemClearBtn.style.display = "block";
        // other
        elemDivScan.style.display = "none";
        // show item number and list
        showItemNumber();
        showResultList();
    } else if (state === "scan") {
        // scan
        elemDivScan.style.display = "block";
        elemStartBtn.style.display = "inline";
        elemBackBtn.style.display = "inline";
        elemVideo.style.display = "none";
        // other
        elemDivInitial.style.display = "none";
        // result list
        elemResultList.innerHTML = "";
    } else if (state === "send") {
        ;
    }
}


///////////////////////////////////////
// callback functions
///////////////////////////////////////

// スキャン画面ボタン
function callbackScanBtn(): void {
    setUIState("scan");
};

// 戻るボタン
function callbackBackBtn(): void {
    setUIState("initial");
};


// スキャン開始・スキャン停止ボタン
async function callbackStartBtn() {
    if (!scanning) {
        // Start
        scanning = true;
        elemStartBtn.textContent = "スキャン停止";
        elemBackBtn.disabled = true;
        elemBackBtn.style.backgroundColor = "gray";
        elemVideo.style.display = "block";
        startVideo();
    } else {
        // Stop
        scanning = false;
        elemStartBtn.textContent = "スキャン開始";
        elemBackBtn.disabled = false;
        elemBackBtn.style.backgroundColor = "#007bff";
        elemVideo.style.display = "none";
        stopVideo();
    }
};


// 結果クリアボタン
function callbackClearBtn(): void {
    const result = confirm("保持データを消去しますか？");

    if (result) {
        dataArr = [];
        lastText = "";
        showItemNumber();
        elemResultList.innerHTML = "";
        localStorage.removeItem(storageNameData);
    }
};



///////////////////////////////////////
// other functions
///////////////////////////////////////

// カメラ起動 & バーコード検出
async function startVideo() {
    stream = await navigator.mediaDevices
        .getUserMedia({
            audio: false,
            video: { facingMode: "environment" }
        });
    elemVideo.srcObject = stream;
    detect();  // バーコード検出
};

// カメラ停止
function stopVideo(): void {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        elemVideo.srcObject = null;
        stream = null;
    }
}


// バーコード検出
async function detect() {
    try {
        const barcodes = await detector.detect(elemVideo);
        if (barcodes.length > 0) {
            analyzeBarcode(barcodes[0].rawValue);
        }
    } catch (e) {
        console.error(e);
    }
    setTimeout(detect, 500);
}


// バーコード解析
// スタート文字[A-D]とストップ文字[A-D]の中に含まれる6桁の数字を取得
//    => 6桁の数字が学籍番号
function analyzeBarcode(code: string): void {
    if (code === lastText) return;

    const match = code.match(matchStr);
    if (match) {
        addResultItem(match[1]);
        lastText = code;
        saveStorageData(dataArr);
    } else {
        alert("無効なバーコードです");
    }
};


// 結果を配列に追加
// ID, timestamp
function addResultItem(id: string): void {
    const now = new Date();

    const formatter = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const obj = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const timeStr = `${obj.year}-${obj.month}-${obj.day}T${obj.hour}:${obj.minute}:${obj.second}`;

    const resultItem = <HTMLElement>document.createElement("div");
    resultItem.className = "result-item";
    resultItem.textContent = `ID: ${id} (timestamp ${timeStr})`;
    elemResultList.insertBefore(resultItem, elemResultList.firstChild);

    dataArr.push({ "id": id, "timestamp": timeStr });

    showItemNumber();
    playBeepSound(100);      // 100 msec
    navigator.vibrate(100);  // 100 msec
};



///////////////////////////////////////
// display item number
///////////////////////////////////////

function showItemNumber(): void {
    const num = new Set(dataArr.map(item => item["id"]));
    const total = dataArr.length;
    elemItemNumber.textContent = `登録 ${num["size"]}件（合計 ${total}件）`;
};


// display result list
function showResultList(): void {
    // sort (1) id and (2) timestamp
    const sorted = [...dataArr].sort((a, b) => {
        // (1) compare id
        const idCompare = Number(a["id"]) - Number(b["id"]);
        if (idCompare !== 0) return idCompare;
        // (2) compare timestamp
        if (a["timestamp"] < b["timestamp"]) return -1;
        if (a["timestamp"] > b["timestamp"]) return 1;
        return 0;
    });

    const unique = sorted.filter((item, index, self) =>
      index === self.findIndex(t => t["id"] === item["id"])
    );

    let str = "";
    for (const dict of unique) {
        str = str + `${dict["id"]}: ${dict["timestamp"]}<BR>`;
    }
    elemResultList.innerHTML = str;
};


// Beep sound
//   duration: msec
function playBeepSound(duration: number): void {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const context = new AudioCtx();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.type = "sine";
    oscillator.frequency.value = 1000;
    gainNode.gain.value = 0.1;

    oscillator.start();
    oscillator.stop(context.currentTime + duration / 1000);
};



///////////////////////////////////////
// storage
///////////////////////////////////////

// save data to localStorage
function saveStorageData(data: Item[]): void {
    localStorage.setItem(storageNameData, JSON.stringify(data))
}

// get data in localStorage
function loadStorageData(): Item[] {
    const data: string | null = localStorage.getItem(storageNameData);
    return data ? JSON.parse(data): [];
}



///////////////////////////////////////
// Initialization
///////////////////////////////////////
document.addEventListener("DOMContentLoaded", () => {
    setUIState("initial");
    dataArr = loadStorageData();
    // show item number and list
    showItemNumber();
    showResultList();
});

