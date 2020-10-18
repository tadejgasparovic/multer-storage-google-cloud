import { Bucket, BucketOptions, CreateWriteStreamOptions, FileOptions, Storage, StorageOptions } from '@google-cloud/storage';
import { Request } from 'express';
import { StorageEngine } from 'multer';
import { join } from 'path';
import * as crypto from 'crypto';
import * as _ from 'lodash';

export type DestinationFactory = ((
	req: Request,
	file: Express.Multer.File,
	callback: (error: Error | null, destination: string) => void
) => void);
export interface GoogleCloudOptions {
	bucketName: string;
	destination?: string | DestinationFactory;
	bucketOptions?: BucketOptions;
	writeStreamOptions?: CreateWriteStreamOptions;
	fileOptions?: FileOptions;
};
const googleCloudOptions = ['bucketName', 'destination', 'bucketOptions', 'writeStreamOptions', 'fileOptions'];

export class MulterGoogleCloudStorage extends Storage implements StorageEngine {

	private options: GoogleCloudOptions;
	public selectedBucket: Bucket;

	constructor(options: StorageOptions & GoogleCloudOptions)
	{
		super(_.omit(options, googleCloudOptions));
		this.options = _.pick(options, googleCloudOptions) as GoogleCloudOptions;
		this.selectedBucket = this.bucket(this.options.bucketName, this.options.bucketOptions);
	}

	private async getDestination(req: Request, file: Express.Multer.File): Promise<string>
	{
		const randomId = crypto.randomBytes(8).toString('hex');
		if(typeof this.options.destination === 'string') return join(this.options.destination, file.originalname + randomId);
		else if(typeof this.options.destination === 'function')
		{
			const destinationFactory = this.options.destination as DestinationFactory;
			return new Promise((resolve, reject) => (
					destinationFactory(req, file, (e, d) => e ? reject(e) : resolve(d))
				)
			);
		}
		else return file.originalname + randomId;
	}

	async _handleFile(
		req: Request,
		file: Express.Multer.File,
		callback: (error?: any, info?: Partial<Express.Multer.File>) => void
	): Promise<void>
	{
		try
		{
			const destination = await this.getDestination(req, file);
			const bucketFile = this.selectedBucket.file(destination, this.options.fileOptions);
			const bucketFileWriteStream = bucketFile.createWriteStream(this.options.writeStreamOptions);
			file.stream.pipe(bucketFileWriteStream)
						.on('finish', async () => callback(null, { destination }))
						.on('error', e => callback(e));
		}
		catch(e)
		{
			callback(e);
		}
	}

	async _removeFile(
		req: Request,
		file: Express.Multer.File,
		callback: (error: Error | null) => void
	): Promise<void>
	{
		try
		{
			const destination = await this.getDestination(req, file);
			const bucketFile = this.selectedBucket.file(destination, this.options.fileOptions);
			if(!(await bucketFile.exists())[0]) return callback(null);
			await bucketFile.delete();
			callback(null);
		}
		catch(e)
		{
			callback(e);
		}
	}
}