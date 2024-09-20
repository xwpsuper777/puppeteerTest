const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

function isRecoverableNetworkErrorMessage(err) {
  if (err instanceof Error) {
    const message = err.message;
    const re = /net::(ERR_NETWORK_CHANGED|ERR_CONNECTION_CLOSED)/;
    return re.test(message);
  }
  return false;
}

async function sleep(seconds) {
  console.log(`sleeping ${seconds} seconds`);
  await new Promise((r) => setTimeout(r, seconds * 1000));
}

async function goto(url) {
  // 设置下载路径
  const downloadPath = path.join(__dirname, 'downloads');

  console.log(downloadPath, 'downloadPath')
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-setuid-sandbox",
      "--no-first-run",
      "--no-zygote",
      "--no-sandbox",
      '--disable-web-security', // 禁用 Web 安全策略
      '--allow-file-access-from-files', // 允许从文件访问文件
      '--disable-features=IsolateOrigins,site-per-process', // 禁用隔离起源
      '--unsafely-treat-insecure-origin-as-secure=http://yyfssc.yybip.com',
      // `--user-data-dir=${userDataDir}`,
      // `--download.default_directory=${downloadPath}`
    ],
    prefs: {
      'download.default_directory': downloadPath,
      'download.prompt_for_download': false,
      'download.directory_upgrade': true,
      "safebrowsing.enabled": false,
      "safebrowsing.disable_download_protection": true
    }
  });

  const page = await browser.newPage();

  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath,
  });
  
  // 设置页面的默认超时时间为 60 秒（60000 毫秒）
  page.setDefaultTimeout(60000); // 60 秒

  // 监听浏览器中的所有页面/标签
  const pages = [page];
  browser.on('targetcreated', async target => {
    if (target.type() === 'page') { // 只关注新打开的页面
      const newPage = target.page();
      pages.push(newPage);
      let a = await newPage
      console.log('新页面已添加', a.url(), pages, pages.length);
    }
  });
  await page.emulateTimezone("Asia/Shanghai");
  await page.goto(url, {
    waitUntil: "networkidle2",
  });
  await page.setViewport({
    width: 1200,
    height: 800,
  });
  await sleep(3)
  await page.waitForSelector('#submitBtn > div.btn_center > div > div')
  // 账号
  await page.locator("input[name='userid']").fill('xuweip0')
  // 密码
  await page.locator("input[name='password']").fill('Password772244@')
  // 点击登录
  await page.click("#submitBtn > div.btn_center > div > div");
  // 登陆成功
  await sleep(30)

  await page.locator('#weberm_MyExpBillPortlet_weberm_myExpBillFunPortlet_iframe').wait();
  // 获取页面的所有 frames 包括顶级页面和 iframe
  const frames = await page.frames();

  // 假设我们要操作的是第一个 iframe
  const iframe = frames[1]; // frames[0] 通常是顶级页面

  // 等待 iframe 内部的元素加载完成
  await iframe.waitForSelector('#UncompleteTab > div > table:nth-child(2) > tbody > tr > td:nth-child(2) > a');
  // 在 iframe 内点击该元素
  await iframe.click('#UncompleteTab > div > table:nth-child(2) > tbody > tr > td:nth-child(2) > a');
  await sleep(3)

  setTimeout(async () => {
    // 切换到最新打开的页面
    let newPage = await pages[pages.length - 1];

    // 设置页面的默认超时时间为 60 秒（60000 毫秒）
    newPage.setDefaultTimeout(60000); // 60 秒

    await newPage.setViewport({
      width: 1200,
      height: 800,
    });
    await sleep(2)
    await newPage.locator('#bfPrint').wait()
    // 监听原生alert弹窗事件
    newPage.on('dialog', async dialog => {
      console.log('Alert dialog message:', dialog.message());
      // 点击确定按钮
      await dialog.accept();
    })
    // 打印
    await newPage.click('#bfPrint')
    console.log('点击打印')
    await sleep(60)
    setTimeout(async () => {
      console.log('+++++++++', pages)
      let p = await pages[pages.length - 1];
      const downloadpage = p

      // 设置页面的默认超时时间为 60 秒（60000 毫秒）
      downloadpage.setDefaultTimeout(60000); // 60 秒
      let pdfUrl = downloadpage.url()
      console.log(pdfUrl, 'pdfUrl_+_+_+_+_+_')
      console.log('当前下载页面URL:', downloadpage.url());
      await downloadpage.setViewport({
        width: 1200,
        height: 800,
      });
      sleep(3)
      // 监听原生alert弹窗事件
      downloadpage.on('dialog', async dialog => {
        console.log('Alert dialog message:', dialog.message());
        // 点击确定按钮
        await dialog.accept();
      })
      // 方案一 将页面生成pdf
      await downloadpage.pdf({
        path: './test.pdf',
        format: 'A4',
      })
      console.log('方案一 将页面生成pdf:下载完成')
      // 设置 Content-Security-Policy 策略
      await downloadpage.evaluateOnNewDocument(() => {
        const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; object-src 'self'; frame-src 'self'; img-src 'self' data:; connect-src 'self'; style-src 'self' 'unsafe-inline'";
        document.addEventListener('DOMContentLoaded', function () {
          const meta = document.createElement('meta');
          meta.httpEquiv = 'Content-Security-Policy';
          meta.content = csp;
          document.head.appendChild(meta);
        });
      });
      // 方案二 使用a标签下载pdf（地址非https）
      // 使用 Puppeteer 的 `page.evaluate` 方法来发起请求并下载 PDF 文件
      await downloadpage.evaluate(async (url) => {
        // 在页面上下文中发起请求
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status}`);
        }

        // 获取 PDF 文件的 Blob 数据
        const blob = await response.blob();

        // 创建一个隐藏的 `<a>` 标签用于下载文件
        const a = document.createElement('a');
        a.style.display = 'none';
        document.body.appendChild(a);

        // 创建一个 Blob URL
        const urlObject = window.URL.createObjectURL(blob);

        // 设置 `<a>` 标签的 `href` 属性
        a.href = urlObject;

        // 设置 `download` 属性
        a.download = 'downloaded.pdf';

        // 触发点击事件
        a.click();

        // 清理工作
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(urlObject);
        }, 0);
      }, pdfUrl);
      console.log('方案一 将页面生成pdf:下载完成')

      // // 监听页面的 console 输出
      // downloadpage.on('console', msg => {
      //   const args = msg._args;
      //   console.log(args, 'args++++++------')
      //   if (Array.isArray(args)) {
      //       const text = args.map(arg => arg.jsonValue()).join(' ');
      //       console.log('PAGE LOG:', text);
      //   } else {
      //       console.log('PAGE LOG:', msg.text());
      //   }
      // });
      // try {
      //   // 使用 Puppeteer 的 `evaluateHandle` 方法来发起请求并获取 ArrayBuffer
      //   const jsHandle = await downloadpage.evaluateHandle(async (url) => {
      //     // 在页面上下文中发起请求
      //     const response = await fetch(url);
      //     console.log(response, 'response++++++')
      //     if (!response.ok) {
      //       throw new Error(`Failed to fetch PDF: ${response.status}`);
      //     }

      //     // 获取 PDF 文件的 ArrayBuffer
      //     const reader = response.body.getReader();
      //     let chunks = [];
      //     let totalBytes = 0;

      //     while (true) {
      //       const { done, value } = await reader.read();
      //       if (done) break;
      //       chunks.push(value);
      //       totalBytes += value.byteLength;
      //     }

      //     // 合并所有 chunk 为一个 ArrayBuffer
      //     const result = new Uint8Array(totalBytes);
      //     let offset = 0;
      //     for (const chunk of chunks) {
      //       result.set(new Uint8Array(chunk), offset);
      //       offset += chunk.byteLength;
      //     }

      //     return result.buffer;
      //   }, pdfUrl);

      //   // 将 ArrayBuffer 转换为 JavaScript 值
      //   const arrayBuffer = await jsHandle.jsonValue();

      //   console.log(arrayBuffer, 'arrayBuffer++++++')

      //   // 将 ArrayBuffer 转换为 Buffer 并写入文件
      //   const buffer = Buffer.from(arrayBuffer);
      //   fs.writeFile('./downloaded.pdf', buffer, (err) => {
      //     if (err) {
      //       console.error('Error writing file:', err);
      //     } else {
      //       console.log('PDF file downloaded successfully.');
      //     }
      //   });

      //   // 等待一段时间以确保文件写入完成
      //   await new Promise(resolve => setTimeout(resolve, 5000));
      // } catch (error) {
      //   console.error('Error downloading PDF:', error);
      // }

    }, 1000)

  }, 1000)

  return {
    body: html,
    headers: {
      "content-type": "text/html",
    },
    statusCode: 200,
  };
}

const handler = async function (event, context, callback) {
  let url = null;

  if (!url) {
    url = "http://yyfssc.yybip.com/portal/app/mockapp/login.jsp?lrid=1";
  }

  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    url = "http://" + url;
  }

  console.log(`url = ${url}`);

  const count = 1;

  for (let i = 0; i < count; i++) {
    try {
      const ret = await goto(url);
      callback(null, ret);
    } catch (err) {

      callback(null, {
        body: err.message,
        headers: {
          "content-type": "text/plain",
        },
        statusCode: 500,
      });

    }
  }
};


handler(1, 2, (res, res1) => { console.log(res, res1) })
