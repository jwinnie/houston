/**
 * houston/src/worker/task/debian/changelog.ts
 * Updates, lints, and validates the Debian changelog file.
 */

import * as cheerio from 'cheerio'
import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'

import markdown from '../../../lib/utility/markdown'
import { sanitize } from '../../../lib/utility/rdnn'
import template from '../../../lib/utility/template'
import { Log } from '../../log'
import { IChange, IContext } from '../../type'
import { Task } from '../task'

export class DebianChangelog extends Task {

  /**
   * File location for the debian changelog file
   *
   * @var {string}
   */
  public static path = 'debian/changelog'

  /**
   * File location for the debian changelog template
   *
   * @var {string}
   */
  public static templatePath = path.resolve(__dirname, 'changelogTemplate.ejs')

  /**
   * Returns the string templated version of the changelog
   *
   * @async
   * @param {IContext} context
   * @return {string}
   */
  public static async template (context: IContext): Promise<string> {
    const changelogs = context.changelog
      .sort((a, b) => (b.date.getTime() - a.date.getTime()))
    const changes = (await this.getChanges(changelogs))
    const name = sanitize(context.nameDomain, '-')

    const file = await fs.readFile(this.templatePath, 'utf8')
    const changelog = template(file, { changelogs, context, changes, name })

    return changelog
      // Trim empty lines of whitespace
      .replace(/^\s*$/img, '')
      .trim()
  }

  /**
   * Recursivly gets a list of changes for each changelog item
   *
   * @async
   * @param {Object[]} changelogs
   * @return {Array[]}
   */
  protected static async getChanges (changelogs = []): Promise<string[][]> {
    const changes = []

    for (const version of changelogs) {
      changes.push(await this.parseMarkdown(version.changes))
    }

    return changes
  }

  /**
   * Parses a markdown string to find a list of changes
   *
   * @param {string} changes
   * @return {string[]}
   */
  protected static async parseMarkdown (changes): Promise<string[]> {
    const html = markdown(changes)
    const $ = cheerio.load(html)
    const values = []

    // A normal list in the markdown
    if ($('ul').length > 0) {
      $('ul > li').each(function () {
        values.push($(this).text())
      })
    // Transform paragraphs into the changes
    } else if ($('p').length > 0) {
      $('p').each(function () {
        values.push($(this).text())
      })
    }

    if (values.length < 1) {
      values.push('Version Bump')
    }

    return values
  }

  /**
   * Returns the full path for the debian changelog file and the current test.
   *
   * @return {String}
   */
  protected get path () {
    return path.resolve(this.worker.workspace, 'dirty', DebianChangelog.path)
  }

  /**
   * Checks the Debian changelog file for errors
   *
   * @async
   * @return {void}
   */
  public async run () {
    await this.fill()

    // TODO: Lint?
  }

  /**
   * Fills the changelog file with all known changes
   * TODO: Convert markdown changes to a list
   *
   * @return {void}
   */
  public async fill () {
    await fs.ensureFile(this.path)

    if (this.worker.context.changelog.length === 0) {
      this.worker.context.changelog.push(this.noopChange())
    }

    const changelog = await DebianChangelog.template(this.worker.context)

    await fs.writeFile(this.path, changelog, 'utf8')
  }

  /**
   * Returns a blank change we will insert into the changelog
   *
   * @return {Object}
   */
  protected noopChange () {
    return {
      author: this.worker.context.nameDeveloper,
      changes: 'Version Bump',
      date: new Date(),
      version: this.worker.context.version
    } as IChange
  }
}
