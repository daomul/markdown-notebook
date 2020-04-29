import React, { useState } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css'
import 'easymde/dist/easymde.min.css'
import { v4 as uuidv4 } from 'uuid';
import { faPlus, faFileImport } from '@fortawesome/free-solid-svg-icons'
import SimpleMDE from 'react-simplemde-editor'

import FileSearch from './components/FileSearch'
import FileList from './components/FileList'
import BottomBtns from './components/BottomBtns'
import TabList from './components/TabList'
import Loader from './components/Loader'
import useIpcrRenderer from './hooks/useIpcrRenderer'
import { flattenArr, objectToArray, timestampToString } from './utils/helper'
import fileHelper from './utils/fileHelper'

const { join, basename, extname, dirname } = window.require('path')
const { remote, ipcRenderer } = window.require('electron')
const Store = window.require('electron-store')
const fileStore = new Store({ 'name': 'FilesData' }) // 默认是 config.json , 存储在 ～/Library/Application Support/markdown-notebook/
const settingStore = new Store({ name: 'Settings' })

//
const getAutoSync = () => ['accessKey', 'secretKey', 'bucketName', 'enableAutoSync'].every(key => !!settingStore.get(key))

// store
const saveFilesToStore = (files) => {
  const filesStoreObj = objectToArray(files).reduce((result, file) => {
    const { id, path, title, createdAt, isSynced, updatedAt } = file
    result[id] = { id, path, title, createdAt, isSynced, updatedAt }
    return result
  }, {})
  fileStore.set('files', filesStoreObj)
}

function App() {

  // state
  const [files, setFiles] = useState(fileStore.get('files') || {})
  const [activeFileID, setActiveFileID] = useState('')
  const [openFileIDs, setOpenedFileIDs] = useState([])
  const [unSaveFileIDs, setUnSaveFileIDs] = useState([])
  const [searchFiles, setSearchFiles] = useState([])
  const [isLoading, setLoading] = useState(false)
  const filesArr = objectToArray(files)

  // file
  const saveLocation = settingStore.get('savedLocation') || remote.app.getPath('documents')

  // 当前打开的文件
  const activeFile = files[activeFileID]
  const openedFiles = openFileIDs.map(openID => {
    return files[openID]
  })
  const fileListArr = (searchFiles.length > 0) ? searchFiles : filesArr

  // function
  //未发现文件事件
  const notFoundFile = (fileID) => {
    var r = window.confirm("未找到此文件,将更新文件列表");
    if (r === true) {
      const { [fileID]: value, ...afterDelete } = files
      setFiles(afterDelete)
      saveFilesToStore(afterDelete)
    }
  }
  // 点中文件操作
  const fileClick = (fileID) => {
    setActiveFileID(fileID)
    const currentFile = files[fileID]
    const { id, title, path, isLoaded, isSynced } = currentFile
    if (!isLoaded) {
      // 是否自动同步云上文件
      debugger
      if (getAutoSync() && isSynced) {
        ipcRenderer.send('download-file', { key: `${title}.md`, path, id })
      } else {
        fileHelper.readFile(currentFile.path).then(value => {
          const newFile = { ...currentFile, body: value, isLoaded: true }
          setFiles({ ...files, [fileID]: newFile })
        }).catch(err => {
          //如果没有找到本地文件，则会删除files里对应的文件
          if (err.toString().includes('no such file or directory')) {
            notFoundFile(fileID)
          } else {
            console.log(false)
          }
        })
      }
    }
    if (!openFileIDs.includes(fileID)) {  // 不存在才加
      setOpenedFileIDs([...openFileIDs, fileID])
    }
  }
  // 点击选项卡操作
  const tabClick = (fileID) => {
    setActiveFileID(fileID)
  }
  // 关闭选项卡操作
  const tabClose = (fileID) => {
    const openTabs = openFileIDs.filter(id => id !== fileID)
    setOpenedFileIDs(openTabs)
    if (openTabs.length > 0) {
      setActiveFileID(openTabs[0])
    } else {
      setActiveFileID('')
    }
  }
  // 修改文件操作
  const fileChange = (fileID, value) => {
    if (value === files[fileID].body) {
      return;
    }
    const modifiedFile = { ...files[fileID], body: value }
    setFiles({ ...files, [fileID]: modifiedFile })
    if (!unSaveFileIDs.includes(fileID)) { // 更新未保存状态
      setUnSaveFileIDs([...unSaveFileIDs, fileID])
    }
  }
  // 删除文件操作
  const deleteFile = (fileID) => {
    if (files[fileID].isNew) {
      delete files[fileID]
      setFiles({ ...files })
      return
    }
    fileHelper.deleteFile(files[fileID].path).then(() => {
      delete files[fileID]
      setFiles({ ...files })
      saveFilesToStore(files)
      tabClose(fileID)
    })
  }
  // 修改文件操作
  const updateFileName = (fileID, title, isNew) => {
    const newPath = isNew ? join(saveLocation, `${title}.md`) : join(dirname(files[fileID].path), `${title}.md`)
    const modifiedFile = { ...files[fileID], title, isNew: false, path: newPath }
    const newFiles = { ...files, [fileID]: modifiedFile }
    if (isNew) {
      fileHelper.writeFile(newPath, files[fileID].body).then(() => {
        setFiles(newFiles)
        saveFilesToStore(newFiles)
      })
    } else {
      fileHelper.renameFile(
        files[fileID].path,
        newPath
      ).then(() => {
        setFiles(newFiles)
        saveFilesToStore(newFiles)
      })
    }

  }
  // 搜索文件操作
  const fileSearch = (keyword) => {
    const newFiles = filesArr.filter(file => file.title.includes(keyword))
    setSearchFiles(newFiles)
  }
  // 创建文件操作
  const createNewFile = () => {
    const newId = uuidv4()
    const newFile = {
      id: newId,
      title: '标题',
      body: '### 测试内容',
      createdAt: new Date().getTime(),
      isNew: true
    }
    setFiles({ ...files, [newId]: newFile })
  }

  //保存当前的文件
  const saveCurrentFile = () => {
    const { path, body, title } = activeFile
    fileHelper.writeFile(
      path,
      body
    ).then(() => {
      setUnSaveFileIDs(unSaveFileIDs.filter(id => id !== activeFile.id))
      // 是否符合自动同步的条件
      if (getAutoSync()) {
        ipcRenderer.send('upload-file', { key: `${title}.md`, path })
      }
    })
  }

  // 导入
  const importFile = () => {
    remote.dialog.showOpenDialog({
      title: '选择导入的文件',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Markdown files', extensions: ['md'] }
      ]
    }).then((paths) => {
      if (!paths.filePaths) {
        return
      }
      // 过滤已经存在的文件
      const filterPaths = paths.filePaths.filter(path => {
        const alreadAdd = Object.values(files).find(file => {
          return file.path === path
        })
        return !alreadAdd
      })
      const importFilesArr = filterPaths.map(path => {
        return {
          id: uuidv4(),
          title: basename(path, extname(path)),
          path
        }
      })
      const newFiles = { ...files, ...flattenArr(importFilesArr) }
      setFiles(newFiles)
      saveFilesToStore(newFiles)
      if (importFilesArr.length > 0) {
        remote.dialog.showMessageBox({
          type: 'info',
          title: 'tip',
          message: `成功导入${importFilesArr.length}个文件！`
        })
      }
    })
  }

  /**
   * 自动保存事件:同步到云端后，更新 本地 store状态, 增加 isSynced 和 updatedAt 
   * ~/Library/Application Support/markdown-notebook/FilesData.json
   * */
  const activeFileUploaded = () => {
    const { id } = activeFile
    const modifiedFile = { ...files[id], isSynced: true, updatedAt: new Date().getTime() }
    const newFiles = { ...files, [id]: modifiedFile }
    setFiles(newFiles)
    saveFilesToStore(newFiles)
  }

  /**
   * 自动下载事件
   * @param {*} event 
   * @param {object} message 包含了{ status: 'node-new-file', id: '' }
   */
  const activeFileDownload = (event, message) => {
    debugger
    console.log('activeFileDownload:', message)
    const currentFile = files[message.id]
    const { id, path } = currentFile
    fileHelper.readFile(path).then(value => {
      let newFile
      if (message.status === 'download-success') {
        newFile = { ...files[id], body: value, isLoaded: true, isSynced: true, updatedAt: new Date().getTime() }
      } else {
        newFile = { ...files[id], body: value, isLoaded: true, isSynced: true }
      }
      const newfiles = { ...files, [id]: newFile }
      setFiles(newfiles)
      saveFilesToStore(newfiles)
    })
  }

  // 文件同步更新上传后，同步更新本地 store 中的状态
  const filesUploaded = () => {
    const newFiles = objectToArray(files).reduce((result, file) => {
      const currentTime = new Date().getTime()
      result[file.id] = {
        ...files[file.id],
        isSynced: true,
        updatedAt: currentTime
      }
      return result
    }, {})
    setFiles(newFiles)
    saveFilesToStore(newFiles)
  }

  // 快捷键
  useIpcrRenderer({
    'create-new-file': createNewFile,
    'import-file': importFile,
    'save-edit-file': saveCurrentFile,
    'active-file-uploaded': activeFileUploaded,
    'file-download': activeFileDownload,
    'files-uploaded': filesUploaded,
    'loading-status': (message, status) => {
      setLoading(status)
    }
  })

  return (
    <div className="App container-fluids px-0">
      {isLoading && <Loader />}
      <div className="row no-gutters">
        <div className="col-3 bg-light left-panel">
          <FileSearch title='云笔记' onFileSearch={fileSearch} />
          <FileList files={fileListArr}
            onFileClick={fileClick}
            onFileDelete={deleteFile}
            onSaveEdit={updateFileName} />
          <div className="row no-gutters button-group">
            <div className="col">
              <BottomBtns text="新建" onBottomBtnClick={createNewFile} colorClass="btn-primary" icon={faPlus} />
            </div>
            <div className="col">
              <BottomBtns text="导入" onBottomBtnClick={importFile} colorClass="btn-success" icon={faFileImport} />
            </div>
          </div>
        </div>
        <div className="col-9 right-panel">
          {
            !activeFile &&
            <div className="start-page-wrap">
              选择或者创建新的 Markdown 文档
            </div>
          }
          {
            activeFile &&
            <>
              <TabList
                files={openedFiles}
                activeId={activeFileID}
                unSaveIds={unSaveFileIDs}
                onTabClick={tabClick}
                onCloseTab={tabClose} />
              <SimpleMDE
                key={activeFile && activeFile.id}
                value={activeFile && activeFile.body}
                options={{ minHeight: '415px' }}
                onChange={(value) => { fileChange(activeFile.id, value) }}
              />
              {
                activeFile.isSynced && <span className="sync-status">已同步，上次同步：{timestampToString(activeFile.updatedAt)}</span>
              }
            </>
          }

        </div>
      </div>
    </div>
  );
}

export default App;
