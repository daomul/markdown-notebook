const { remote, ipcRenderer } = require('electron')
const Store = require('electron-store')
const settingStore = new Store({ name: 'Settings' })

const qiniuConfigArr = ['#savedLocation', '#accessKey', '#secretKey', '#bucketName']
const $ = (selector) => {
    const result = document.querySelectorAll(selector)
    return result.length > 1 ? result : result[0]
}

document.addEventListener('DOMContentLoaded', () => {
    let savedLocation = settingStore.get('savedLocation')
    if (savedLocation) {
        $('#savedLocation').value = savedLocation
    }
    qiniuConfigArr.forEach(selector => {
        const savedValue = settingStore.get(selector.substr(1))
        if (savedValue) {
            $(selector).value = savedValue
        }
    })
    $('#select-new-location').addEventListener('click', () => {
        remote.dialog.showOpenDialog({
            properties: ['openDirectory'],
            message: '选择文件的存储路径'
        }).then(result => {
            const paths = result.filePaths
            if (Array.isArray(paths)) {
                $('#savedLocation').value = paths[0]
                // savedLocation = paths[0]
            }
        })
    })
    $('#settings-form').addEventListener('submit', (e) => {
        e.preventDefault()
        qiniuConfigArr.forEach(selector => {
            if ($(selector)) {
                let { id, value } = $(selector)
                settingStore.set(id, value ? value : null)
            }
        })
        settingStore.set('savedLocation',savedLocation)
        ipcRenderer.send('config-is-saved')
        remote.getCurrentWindow().close()
    })

    $('.nav-tabs').addEventListener('click', e => {
        e.preventDefault()
        $('.nav-link').forEach(element => {
            element.classList.remove('active')
        })
        e.target.classList.add('active')
        $('.config-area').forEach(element => {
            element.style.display = 'none'
        })
        $(e.target.dataset.tab).style.display = 'block'
    })
})