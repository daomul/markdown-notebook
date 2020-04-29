const qiniu = require('qiniu')
const axios = require('axios')
const fs = require('fs')

class QiniuManager {

    constructor(accessKey, secretKey, bucket) {
        this.mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
        this.bucket = bucket

        // init config
        this.config = new qiniu.conf.Config();
        // get zone like hauadong
        this.config.zone = qiniu.zone.Zone_z0;
        this.bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);
        this.publicBucketDomain = 'http://q9hmrnn56.bkt.clouddn.com';
    }

    /**
     * 上传文件
     * @param {*} key 下载的文件
     * @param {{*} localFilePath 本地文件路径
     */
    uploadFile(key, localFilePath) {
        var options = {
            scope: this.bucket + ':' + key
        }
        var putPolicy = new qiniu.rs.PutPolicy(options);
        var uploadToken = putPolicy.uploadToken(this.mac);
        var formUploader = new qiniu.form_up.FormUploader(this.config);
        var putExtra = new qiniu.form_up.PutExtra();
        return new Promise((resolve, reject) => {
            // 文件上传
            formUploader.putFile(uploadToken, key, localFilePath, putExtra, this._handleCallback(resolve, reject));
        })

    }
    /**
     * 下载文件
     * @param {*} key 下载的文件
     * @param {*} downloadPath 
     */
    downloadFile(key, downloadPath) {
        this.generateDownloadLink(key).then(link => {
            const timeStamp = new Date().getTime()
            // get download link
            const url = `${link}?timestamp=${timeStamp}`
            // get readable stream
            return axios({
                url,
                method: "GET",
                responseType: 'stream',
                headers: { 'Cache-Control': 'no-cache' }
            })
        }).then(response => {
            // create write stream
            const writer = fs.createWriteStream(downloadPath)
            response.data.pipe(writer)
            return new Promise((resolve, reject) => {
                writer.on('finish', resolve)
                writer.on('error', reject)
            })
        }).catch(err => {
            return Promise.reject({ err: err.response })
        })
    }

    /**
     * 删除文件
     * @param {*} key 下载的文件
     */
    deleteFile(key) {
        return new Promise((resolve, reject) => {
            this.bucketManager.delete(this.bucket, key, this._handleCallback(resolve, reject))
        })
    }
    //获取bucket域名
    getBucketDomain() {
        const reqUrl = `http://api.qiniu.com/v6/domain/list?tbl=${this.bucket}`
        const digest = qiniu.util.generateAccessToken(this.mac, reqUrl)
        return new Promise((resolve, reject) => {
            qiniu.rpc.postWithoutForm(reqUrl, digest, this._handleCallback(resolve, reject))
        })
    }
    /**
     * 获取云上文件
     * @param {*} key 文件名
     */
    getStat(key) {
        return new Promise((resolve, reject) => {
            this.bucketManager.stat(this.bucket, key, this._handleCallback(resolve, reject))
        })
    }
    /**
     * 生成下载链接
     * @param {*} key 下载的文件
     */
    generateDownloadLink(key) {
        const domainPromise = this.publicBucketDomain ? Promise.resolve([this.publicBucketDomain]) : this.getBucketDomain()
        return domainPromise.then(data => {
            if (Array.isArray(data) && data.length > 0) {
                const pattern = /^https?/
                const _url = data[0]
                this.publicBucketDomain = pattern.test(_url) ? _url : `http://${_url}`
                return this.bucketManager.publicDownloadUrl(this.publicBucketDomain, key)
            } else {
                throw Error('域名未找到')
            }
        })
    }

    /**
     * 操作成功回调
     * @param {*} resolve 
     * @param {*} reject 
     */
    _handleCallback(resolve, reject) {
        return (respErr, respBody, respInfo) => {
            if (respErr) {
                throw respErr;
            }
            if (respInfo.statusCode === 200) {
                resolve(respBody)
            } else {
                reject({
                    statusCode: respInfo.statusCode,
                    body: respBody
                })
            }
        }
    }
}

module.exports = QiniuManager