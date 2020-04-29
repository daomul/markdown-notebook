/**
 * @desc 底部按钮组件
 * @author zeroZheng
*/

import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import PropTypes from 'prop-types'

const BottomBtns = ({ text, colorClass, icon, onBottomBtnClick }) => (
    <button
        type="button"
        className={`btn btn-block no-border ${colorClass}`}
        onClick={onBottomBtnClick}>
        <FontAwesomeIcon icon={icon} size="sm" className="mr-2"/>
        {text}
    </button>
)

BottomBtns.propTypes = {
    text: PropTypes.string,
    colorClass: PropTypes.string,
    icon: PropTypes.object,
    onBottomBtnClick: PropTypes.func
}

BottomBtns.defaultProps = {
    text: '新建'
}

export default BottomBtns