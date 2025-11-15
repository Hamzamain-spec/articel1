import * as fs from "fs";
import * as path from "path";
import archiver from "archiver";

// Note: File storage in /output may not persist in serverless environments like Vercel
// Consider using external storage (S3, R2, etc.) for production deployments

export interface ArticleData {
  keyword: string;
  url: string;
  article: string;
}

export class FileManager {
  private outputDir: string;
  private jobDir: string;

  constructor(jobId: string) {
    // Use /tmp for Vercel serverless, output for local development
    const baseDir = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "output");
    this.outputDir = baseDir;
    this.jobDir = path.join(this.outputDir, jobId);

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    if (!fs.existsSync(this.jobDir)) {
      fs.mkdirSync(this.jobDir, { recursive: true });
    }
  }

  public saveArticle(articleNumber: number, data: ArticleData): void {
    const sanitizedKeyword = data.keyword
      .replace(/[^a-zA-Z0-9]/g, "_")
      .substring(0, 50);

    const folderName = `Article_${articleNumber}_${sanitizedKeyword}`;
    const folderPath = path.join(this.jobDir, folderName);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const filePath = path.join(folderPath, "article.txt");

    fs.writeFileSync(filePath, data.article, "utf-8");
  }

  public async createZipArchive(): Promise<string> {
    const zipPath = path.join(this.jobDir, "articles.zip");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    return new Promise((resolve, reject) => {
      output.on("close", () => {
        resolve(zipPath);
      });

      archive.on("error", (err: Error) => {
        reject(err);
      });

      archive.pipe(output);

      const folders = fs.readdirSync(this.jobDir);
      folders.forEach((folder) => {
        const folderPath = path.join(this.jobDir, folder);
        if (fs.statSync(folderPath).isDirectory()) {
          archive.directory(folderPath, folder);
        }
      });

      archive.finalize();
    });
  }

  public getZipPath(): string {
    return path.join(this.jobDir, "articles.zip");
  }
}