#!/usr/bin/env node
/// <reference types="node" />
///
import "dotenv/config";
import { program } from "./cli";

program.parse(process.argv);