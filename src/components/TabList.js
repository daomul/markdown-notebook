/**
 * @desc 顶部tab列表组件
 * @author zeroZheng
*/

import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import './TabList.scss'

const TabList = ({ files, activeId, unSaveIds, onTabClick, onCloseTab }) => {
    return (
        <ul className="nav nav-pills tablist-component">
            {
                files.map(file => {
                    const unSaveMark = unSaveIds.includes(file.id)
                    const aClassNames = classNames('nav-link', {
                        'active': file.id === activeId,
                        'unsaved': unSaveMark
                    })
                    return (
                        <li className="nav-item" key={file.id}>
                            <a
                                href="#"
                                className={aClassNames}
                                onClick={(e) => { e.preventDefault(); onTabClick(file.id) }}>
                                {file.title}
                                <span
                                    className="ml-2 close-icon"
                                    onClick={(e) => { e.stopPropagation(); onCloseTab(file.id) }}>
                                    <FontAwesomeIcon icon={faTimes} />
                                </span>
                                { unSaveMark && <span className="rounded-circle ml-2 unsaved-icon" /> }
                            </a>
                        </li>
                    )
                })
            }
        </ul>
    )
}
TabList.propTypes = {
    files: PropTypes.array,
    activeId: PropTypes.string,
    unSaveIds: PropTypes.array,
    onTabClick: PropTypes.func,
    onCloseTab: PropTypes.func
}
TabList.defaultProps = {
    unSaveIds: []
}

export default TabList