import * as cache from "@actions/cache";
import * as utils from "@actions/cache/lib/internal/cacheUtils";
import { createTar, listTar } from "@actions/cache/lib/internal/tar";
import * as core from "@actions/core";
import * as path from "path";
import { State } from "./state";
import * as io from '@actions/io'
import {
  getInputAsArray,
  isGhes,
  newMinio,
  isExactKeyMatch,
  getInputAsBoolean,
} from "./utils";
import * as fs from "fs";
import {CompressionMethod} from "@actions/cache/lib/internal/constants";

process.on("uncaughtException", (e) => core.info("warning: " + e.message));

async function saveCache() {
  try {
/*    if (isExactKeyMatch()) {
      core.info("Cache was exact key match, not saving");
      return;
    }*/

    const base32 = require('base32')

    const repoName = process.env['GITHUB_REPOSITORY'] as string
    const repoBranch = process.env['GITHUB_REF_NAME'] as string
    const repoCommit = process.env['GITHUB_SHA'] as string
    core.info(`repoNameFromEnv: ${repoName}`);
    core.info(`repoBranchFromEnv: ${repoBranch}`);
    core.info(`repoCommitFromEnv: ${repoCommit}`);

    const repoBranchBase32 = base32.encode(repoBranch)
    // Inputs are re-evaluted before the post action, so we want the original key
    const key = core.getState(State.PrimaryKey);
    const keyBase32 = base32.encode(key);  // 并非标准的base32算法，参考：https://github.com/agnoster/base32-js
    // const useFallback = getInputAsBoolean("use-fallback");
    const paths = getInputAsArray("path");

    try {
      // const mc = newMinio({
      //   // Inputs are re-evaluted before the post action, so we want the original keys & tokens
      //   accessKey: core.getState(State.AccessKey),
      //   secretKey: core.getState(State.SecretKey),
      //   sessionToken: core.getState(State.SessionToken),
      // });

      // const compressionMethod = await utils.getCompressionMethod();
      const compressionMethod = CompressionMethod.Gzip;
      const cachePaths = await utils.resolvePaths(paths);
      core.info("Cache Paths:");
      core.info(`${JSON.stringify(cachePaths)}`);

      // "-v /root/cache-test/caches:/home/runner/work/cache-exp"

      const archiveFolder = await utils.createTempDirectory();
      const cacheFileName = utils.getCacheFileName(compressionMethod);
      const archiveFolderReal = path.join(archiveFolder, "../../cache-exp", repoName, repoBranchBase32, repoCommit, keyBase32);
      // fs.mkdirSync(archiveFolderReal, { recursive: true });
      await io.mkdirP(archiveFolderReal)
      if (fs.existsSync(archiveFolderReal)) {
        core.info(`Archive Path_1: ${archiveFolderReal}   exists`);
      } else {
        core.info(`Archive Path_1: ${archiveFolderReal}   NOT exists`);
      }
      const archivePath = path.join(archiveFolderReal, cacheFileName);

      core.info(`Archive Path: ${archivePath}`);
      core.info(`Cache Key: ${key}`);

      await createTar(archiveFolderReal, cachePaths, compressionMethod);
      if (core.isDebug()) {
        await listTar(archivePath, compressionMethod);
      }

      core.info(`Cache saved to local successfully: ${archivePath}`);


      // const object = path.join(key, cacheFileName);

      // core.info(`Uploading tar to s3. Bucket: ${bucket}, Object: ${object}`);
      // await mc.fPutObject(bucket, object, archivePath, {});
      // core.info("Cache saved to s3 successfully");
    } catch (e) {
      core.info("Save s3 cache failed: " + e.message);
      // if (useFallback) {
      //   if (isGhes()) {
      //     core.warning("Cache fallback is not supported on Github Enterpise.");
      //   } else {
      //     core.info("Saving cache using fallback");
      //     await cache.saveCache(paths, key);
      //     core.info("Save cache using fallback successfully");
      //   }
      // } else {
      //   core.debug("skipped fallback cache");
      // }
    }
  } catch (e) {
    core.info("warning: " + e.message);
  }
}

saveCache();
