/**
 * @desc 文件列表组件
 * @author zeroZheng
*/

import React, { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { faMarkdown } from '@fortawesome/free-brands-svg-icons'
import PropTypes from 'prop-types'
import useKeyPress from '../hooks/useKeyPress'
import useContextMenu from '../hooks/useContextMenu'
import {getParentNode} from '../utils/helper'

const FileList = ({ files, onFileClick, onSaveEdit, onFileDelete }) => {

    const [editStatus, setEditStatus] = useState(false)
    const [value, setValue] = useState('')

    const escPressed = useKeyPress(27)
    const enterPressed = useKeyPress(13)

    const closeSearch = (editItem) => {
        setEditStatus(false)
        setValue('')
        if(editItem.isNew) {
            onFileDelete(editItem.id)
        }
    }

    // 持久化状态
    let node = useRef(null)

    const clickedElement = useContextMenu([
        {
            label: '打开',
            click: () => {
                const parentEle = getParentNode(clickedElement.current, 'file-item')
                if (parentEle) {
                    onFileClick(parentEle.dataset.id)
                }
            }
        },{
            label: '重命名',
            click: () => {
                const parentEle = getParentNode(clickedElement.current, 'file-item')
                if (parentEle) {
                    setEditStatus(parentEle.dataset.id)
                    setValue(parentEle.dataset.title)
                }
            }
        },{
            label: '删除',
            click: () => {
                const parentEle = getParentNode(clickedElement.current, 'file-item')
                if (parentEle) {
                    onFileDelete(parentEle.dataset.id)
                }
            }
        }
    ], '.file-list')

    /**
     * 第一次 render 之后和每次 update 之后都会运行
     * 可以访问 useState
     * */
    useEffect(() => {
        const editItem = files.find(file => file.id === editStatus)
        // 处理键盘事件
        if (enterPressed && editStatus && value.trim() !== '') {
            onSaveEdit(editItem.id, value, editItem.isNew)
            setEditStatus(false)
            setValue('')
        } else if (escPressed && editStatus) {
            closeSearch(editItem)
        }
    })
    useEffect(() => {
        const newFile = files.find(file => file.isNew)
        if(newFile) {
            setEditStatus(newFile.id)
            setValue(newFile.title)
        }
    }, [files])
    useEffect(() => {
        // 点击搜索时呈现“输入状态”
        if (editStatus) {
            node.current && node.current.focus()
        }
    }, [editStatus])

    return (
        <ul className="list-group list-group-flush file-list">
            {
                files.map(file => (
                    <li className="row list-group-item bg-light d-flex align-items-center file-item mx-0"
                        key={file.id}
                        data-id={file.id}
                        data-title={file.title}>
                        {
                            (file.id !== editStatus && !file.isNew) &&
                            <>
                                <span className="col-2"><FontAwesomeIcon icon={faMarkdown} size="sm" /></span>
                                <span className="col-10 c-link" onClick={() => { onFileClick(file.id) }}>{file.title}</span>
                            </>
                        }
                        {(file.id === editStatus || file.isNew) &&
                            <>
                                <input className="form-control col-10"
                                    ref={node}
                                    value={value}
                                    placeholder="请输入文件名"
                                    onChange={(e) => { setValue(e.target.value) }} />
                                <button type="button" className="icon-button col-2"
                                    onClick={() => {closeSearch(file)}}>
                                    <FontAwesomeIcon icon={faTimes} title="close" size="lg" />
                                </button>
                            </>
                        }
                    </li>
                ))
            }
        </ul>
    )
}

FileList.propTypes = {
    files: PropTypes.array,
    onFileClick: PropTypes.func,
    onFileDelete: PropTypes.func,
    onSaveEdit: PropTypes.func
}

export default FileList