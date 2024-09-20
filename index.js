const fs = require("fs");
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
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-setuid-sandbox",
      "--no-first-run",
      "--no-zygote",
      "--no-sandbox",
    ],
  });

  const page = await browser.newPage();
  
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
    await newPage.locator('#accessorymanagement').wait()
    // 监听原生alert弹窗事件
    newPage.on('dialog', async dialog => {
      console.log('Alert dialog message:', dialog.message());
      // 点击确定按钮
      await dialog.accept();
    })
    // 点击未生效，暂时需要手工跳过
    await newPage.click('#accessorymanagement')
    console.log('点击附件管理')
    await sleep(3)
    setTimeout(async ()=>{
      let p = await pages[pages.length - 1];
      const uploadpage = p
      
      // 设置页面的默认超时时间为 60 秒（60000 毫秒）
      uploadpage.setDefaultTimeout(60000); // 60 秒
      
      console.log('当前页面URL:', uploadpage.url());
      await uploadpage.setViewport({
        width: 1200,
        height: 800,
      });
      // 监听原生alert弹窗事件
      uploadpage.on('dialog', async dialog => {
      console.log('Alert dialog message:', dialog.message());
      // 点击确定按钮
      await dialog.accept();
    })
      await sleep(3)
      await uploadpage.waitForSelector('#table3 > tbody > tr > td > form > input[type=file]:nth-child(1)')
      console.log('找到文件上传了')
      await sleep(3)
      const [fileChooser] = await Promise.all([
        uploadpage.waitForFileChooser(),
        uploadpage.click('#table3 > tbody > tr > td > form > input[type=file]:nth-child(1)'), // some button that triggers file selection
      ]);
      await fileChooser.accept(['/Users/xwp/Desktop/test/puppeteer/1.jpg']);
      await sleep(3)
      await uploadpage.click('#table3 > tbody > tr > td > form > input[type=submit]:nth-child(2)')
      console.log('文件已上传')

    },1000)

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
