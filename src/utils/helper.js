// 将数组的数组归并到一个新的 object中，并以 id 为key， 对应数组项为 value
export const flattenArr = (arr) => {
    return arr.reduce((map, item) => {
        map[item.id] = item
        return map
    }, {})
}

// 反向解析 flattenArr 方法的数据，将 object 中的各个数组项转化为原数组集合
export const objectToArray = (obj) => {
    return Object.keys(obj).map(key => obj[key])
}

// 获取符合条件的当前节点的上级节点
export const getParentNode = (node, parentClassName) => {
    let current = node
    while (current !== null) {
        if (current.classList && current.classList.contains(parentClassName)) {
            return current
        }
        current = current.parentNode
    }
    return false
}

// 转化时间戳格式
export const timestampToString = (stamp) => {
    const date = new Date(stamp)
    return date.toLocaleDateString() + '' + date.toLocaleTimeString()
}