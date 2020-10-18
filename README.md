# Google Cloud Multer Storage Engine
Lightweight, stream-based implementation of a [Multer storage engine](https://www.npmjs.com/package/multer) for storing uploaded files in a [Google Cloud bucket](https://cloud.google.com/storage) built with TypeScript.

## Installation
**Npm:**
> `npm i -S @duplex/multer-storage-google-cloud`

**Yarn:**
> `yarn add @duplex/multer-storage-google-cloud`

## Usage & Example
> For a full working example see [test/index.ts](test/index.ts). Run the example using `npm test` or `yarn test`.

Simply configure a new instance of the storage engine and pass it to [Multer](https://www.npmjs.com/package/multer):

```ts
...
import { MulterGoogleCloudStorage } from '@duplexsi/multer-storage-google-cloud';

const storage = new MulterGoogleCloudStorage({
	bucketName: "test-bucket",
	keyFilename: join(__dirname, '..', 'google-storage.json'),
	destination: (req, f, cb) => cb(null, `profile-pictures/${f.originalname}`)
});

const app = express();
app.post('/', multer({ storage }).single('file'), (req, res) => {
	// ...
	res.send(/* ... */);
});
...
```
The library also exposes the selected bucket for direct access (refer to the [Google Cloud Storage NodeJS Client documentation](https://googleapis.dev/nodejs/storage/latest/index.html)):
 ```ts
router.get('/uploads/*', async (req, res) => {
	const [,, ...file] = req.path.split('/');

	const bucketFile = storage.selectedBucket.file(file.join('/'));
	if(!(await bucketFile.exists())[0]) return res.status(404).send("Not Found");

	const fileReadStream = bucketFile.createReadStream();
	fileReadStream.pipe(res);
});
 ```

### Constructor Options
|       Name           |                     Description                                                                                                                                                                                                                           |
|----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `bucketName`         | **Required.** The name of the bucket to upload into.                                                                                                                                                                                                      |
| `destination`        | **Optional.** Full path to the destination directory in the bucket or a factory function which is called for every uploaded file with the Express `req`, Multer `file`, and a `callback`. It must return the full destination path, including the filename! |
| `bucketOptions`      | **Optional.** `BucketOptions` passed to [`storage.bucket(name, options)`](https://googleapis.dev/nodejs/storage/latest/Storage.html#bucket)                                                                                                               |
| `writeStreamOptions` | **Optional.** `CreateWriteStreamOptions` passed to [`bucketFile.createWriteStream(options)`](https://googleapis.dev/nodejs/storage/latest/File.html#createWriteStream)                                                                                    |
| `fileOptions`        | **Optional.** `FileOptions` passed to [`bucket.file(name, options)`](https://googleapis.dev/nodejs/storage/latest/Bucket.html#file)                                                                                                                       |
