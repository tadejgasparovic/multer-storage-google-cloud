import { createServer } from 'http';
import * as express from 'express';
import * as multer from 'multer';
import { join } from 'path';

import { MulterGoogleCloudStorage } from '../dist/multer-google-cloud-storage';

const storage = new MulterGoogleCloudStorage({
	bucketName: "test-bucket",
	keyFilename: join(__dirname, '..', 'google-storage.json'),
	destination: (req, f, cb) => cb(null, `profile-pictures/${f.originalname}`)
});

const app = express();
const htmlForm = `
<form action="/" method="POST" enctype="multipart/form-data">
<input type="file" name="file">
<input type="submit" value="Upload">
</form>
`;
const router = express.Router();
router.get('/', (req, res) => res.send(htmlForm));
router.post('/', multer({ storage }).single('file'), (req, res) => {
	const alert = `<strong>File uploaded to '${req.file.destination}'</strong>`;
	res.send(htmlForm + alert);
});
router.get('/uploads/*', async (req, res) => {
	const [,, ...file] = req.path.split('/');
	const bucketFile = storage.selectedBucket.file(file.join('/'));
	if(!(await bucketFile.exists())[0]) return res.status(404).send("Not Found");
	const fileReadStream = bucketFile.createReadStream();
	fileReadStream.pipe(res);
});

app.use(router);

const server = createServer(app);
server.listen(3000, () => console.log("Ready on http://0.0.0.0:3000"));