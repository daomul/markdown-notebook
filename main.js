const { app, Menu, dialog, ipcMain } = require('electron')
const isDev = require('electron-is-dev')
const path = require('path')
const Store = require('electron-store')
const { autoUpdater } = require('electron-updater')
const menuTemplate = require('./src/utils/menuTemplate')
const AppWindow = require('./src/AppWindow')
const QiniuManager = require('./src/utils/QiniuManager')
const settingStore = new Store({ name: 'Settings' })
const fileStore = new Store({ 'name': 'FilesData' })
let mainWindow, settingsWindow

const createManger = () => {
    const accessKey = settingStore.get('accessKey')
    const secretKey = settingStore.get('secretKey')
    const bucketName = settingStore.get('bucketName')
    return new QiniuManager(accessKey, secretKey, bucketName)
}

app.on('ready', () => {

    // auto update
    if (isDev) {
        autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml')
    }
    autoUpdater.autoDownload = false
    autoUpdater.checkForUpdates()
    autoUpdater.on('error', (error) => {
        console.log(error)
        dialog.showErrorBox('Error', error === null ? "unknown" : (error.status))
    })
    autoUpdater.on('checking-for-update', () => {
        console.log('checking-for-update')
    })
    autoUpdater.on('update-available', () => {
        dialog.showMessageBox({
            type: 'info',
            title: '应用有新版本，',
            message: `应有有新版本，是否现在更新`,
            buttons: ['是', '否']
        }).then((buttonIndex) => {
            console.log(buttonIndex.response)
            if (buttonIndex && buttonIndex.response === 0) {
                autoUpdater.downloadUpdate()
            }
        })
    })
    autoUpdater.on('update-not-available', () => {
        dialog.showMessageBox({
            type: 'info',
            title: '没有新版本，',
            message: `当前已经是最新版本`
        })
    })
    autoUpdater.on('download-progress', (progressObj) => {
        let log_message = `Download speed: ${progressObj.bytesPerSecond}`
        log_message += ` - Downloaded ${progressObj.percent} %`
        log_message += ` ( ${progressObj.transferred} / ${progressObj.total} `
        console.log(log_message)
    })
    autoUpdater.on('update-downloaded', () => {
        dialog.showMessageBox({
            type: 'info',
            title: '安装更新',
            message: `更新完毕，即将重启`
        }).then( () => {
            setImmediate(() => { autoUpdater.quitAndInstall() })
        })
    })

    const mainWindowConfig = {
        width: 1440,
        height: 768
    }

    const urlLocation = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, './index.html')}`

    // 重写 BrowserWindow
    mainWindow = new AppWindow(mainWindowConfig, urlLocation)
    mainWindow.on('closed', () => {
        mainWindow = null
    })

    //设置menu
    const menu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(menu)

    // 监听打开“设置”窗口
    ipcMain.on('open-settings-window', () => {
        const settingsWindowConfig = {
            width: 500,
            height: 400,
            parent: mainWindow
        }
        const settingsFileLocation = `file://${path.join(__dirname, './settings/setting.html')}`
        settingsWindow = new AppWindow(settingsWindowConfig, settingsFileLocation)
        settingsWindow.on('closed', () => {
            settingsWindow = null
        })
    })

    //监听设置保存时间
    ipcMain.on('config-is-saved', () => {
        let qiniuMenu = process.platform === 'darwin' ? menu.items[3] : menu.items[2]
        const switchItems = (toggle) => {
            [1, 2, 3].forEach(number => {
                qiniuMenu.submenu.items[number].enabled = toggle
            })
        }
        const qiniuIsConfiged = ['accessKey', 'secretKey', 'bucketName'].every(key => !!settingStore.get(key))
        if (qiniuIsConfiged) {
            switchItems(true)
        } else {
            switchItems(false)
        }
    })

    //监听文件保存事件
    ipcMain.on('upload-file', (event, data) => {
        const manager = createManger()
        manager.uploadFile(data.key, data.path).then(data => {
            console.log('上传成功', data)
            mainWindow.webContents.send('active-file-uploaded')
        }).catch(() => {
            dialog.showErrorBox('同步失败', '请检查七牛云同步是否正确')
        })
    })

    // 监听加载同步云上的文件
    ipcMain.on('download-file', (event, data) => {
        const manager = createManger()
        const filesObj = fileStore.get('files')
        const { key, path, id } = data
        manager.getStat(key).then(resp => {
            const serverupdateTime = Math.round(resp.putTime / 10000)  // putime的单位是 100纳秒（1秒= 10000纳秒）
            const localUpdatedTime = filesObj[id].updateAt
            // 判断本地文件更新时间和云上文件更新时间
            if (serverupdateTime > localUpdatedTime || !localUpdatedTime) {
                manager.downloadFile(key, path).then(() => {
                    mainWindow.webContents.send('file-download', { status: 'download-success', id })
                })
            } else {
                mainWindow.webContents.send('file-download', { status: 'node-new-file', id })
            }
        }).catch(error => {
            console.log('error:', error)
            mainWindow.webContents.send('file-download', { status: 'no-file', id })
        })
    })

    // 全部同步到云端
    ipcMain.on('upload-all-to-qiniu', () => {
        const manager = createManger()
        mainWindow.webContents.send('loading-status', true)
        const filesObj = fileStore.get('files') || {}
        // 组合多个 promise
        const uploadPromiseArr = Object.keys(filesObj).map(key => {
            const file = filesObj[key]
            return manager.uploadFile(`${file.title}.md`, file.path)
        })
        Promise.all(uploadPromiseArr).then(result => {
            dialog.showMessageBox({
                type: 'info',
                title: `成功上传了${result.length}个文件`,
                message: `成功上传了${result.length}个文件`,
            })
            mainWindow.webContents.send('files-uploaded')
        }).catch(error => {
            dialog.showErrorBox('同步失败', '请检查七牛云参数')
        }).finally(() => {
            mainWindow.webContents.send('loading-status', false)
        })

    })
})