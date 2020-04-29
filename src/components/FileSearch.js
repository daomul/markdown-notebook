
/**
 * @desc 搜索组件
 * @author zeroZheng
*/

import React, { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
import PropTypes from 'prop-types'
import useKeyPress from '../hooks/useKeyPress'

const FileSearch = ({ title, onFileSearch }) => {

    // 状态管理
    const [inputActive, setInputActive] = useState(false)
    const [value, setValue] = useState('')

    const escPressed = useKeyPress(27)
    const enterPressed = useKeyPress(13)

    // 持久化状态
    let node = useRef(null)

    // 关闭搜索方法
    const closeSearch = () => {
        setInputActive(false)
        setValue('')
        onFileSearch('')
    }

    /**
     * 第一次 render 之后和每次 update 之后都会运行
     * 可以访问 useState
     * */
    useEffect(() => {
        // 处理键盘事件 
        if (enterPressed && inputActive) {
            onFileSearch(value)
        } 
        if (escPressed && inputActive) {
            closeSearch()
        }
    }, [enterPressed, inputActive, value])
    useEffect(() => {
        // 点击搜索时呈现“输入状态”
        if (inputActive) {
            node.current.focus()
        }
    })

    return (
        <div className='alert alert-primary d-flex justify-content-between align-items-center mb-0'>
            {!inputActive &&
                <>
                    <span>{title}</span>
                    <button type="button" className="icon-button"
                        onClick={() => { setInputActive(true) }}>
                        <FontAwesomeIcon icon={faSearch} title="search" size="lg" />
                    </button>
                </>
            }           
            {inputActive &&
                <>
                    <input className="form-control"
                        ref={node}
                        value={value}
                        onChange={(e) => { setValue(e.target.value) }} />
                    <button type="button" className="icon-button"
                        onClick={closeSearch}>
                        <FontAwesomeIcon icon={faTimes} title="close" size="lg" />
                    </button>
                </>
            }
        </div>
    )
}

FileSearch.propTypes = {
    title: PropTypes.string,
    onFileSearch: PropTypes.func.isRequired
}

export default FileSearch