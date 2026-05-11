from pathlib import Path
import json
from urllib.error import HTTPError, URLError
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

BASE_URL = 'https://zealous-desert-09aaa9703.7.azurestaticapps.net'
OUT_DIR = Path(r'D:\github\public\talks-the-terminal-strikes-back\verification_artifacts')
OUT_DIR.mkdir(parents=True, exist_ok=True)


def read_url(url: str):
    try:
        with urlopen(url, timeout=20) as response:
            body = response.read().decode('utf-8', errors='replace')
            return {'status': response.status, 'body': body}
    except HTTPError as error:
        return {'status': error.code, 'body': error.read().decode('utf-8', errors='replace')}
    except URLError as error:
        return {'status': None, 'body': str(error)}


def record_page(page, label, screenshot_name):
    page.wait_for_load_state('networkidle')
    page.screenshot(path=str(OUT_DIR / screenshot_name), full_page=True)
    return {'label': label, 'screenshot': str(OUT_DIR / screenshot_name)}


def layout_metrics(page):
    return page.evaluate(
        """
        () => {
          const header = document.querySelector('.app-header')?.getBoundingClientRect();
          const timer = document.querySelector('.timer-row')?.getBoundingClientRect();
          const card = document.querySelector('.slide-card')?.getBoundingClientRect();
          const titleStyle = getComputedStyle(document.getElementById('slideTitle'));
          const contentStyle = getComputedStyle(document.getElementById('slideContent'));
          return {
            viewport: { width: window.innerWidth, height: window.innerHeight },
            headerHeight: header?.height ?? 0,
            timerHeight: timer?.height ?? 0,
            slideCardHeight: card?.height ?? 0,
            slideCardTop: card?.top ?? 0,
            titleFontSize: titleStyle.fontSize,
            contentFontSize: contentStyle.fontSize,
            buttonTexts: Array.from(document.querySelectorAll('button')).map((el) => el.textContent.trim()),
          };
        }
        """
    )


def dispatch_swipe(page, start_x, start_y, end_x, end_y):
    page.evaluate(
        """
        ([startX, startY, endX, endY]) => {
          const card = document.getElementById('slideCard');
          const fire = (type, x, y) => {
            const event = new Event(type, { bubbles: true, cancelable: true });
            Object.defineProperty(event, 'changedTouches', {
              value: [{ clientX: x, clientY: y }],
              configurable: true,
            });
            card.dispatchEvent(event);
          };
          fire('touchstart', startX, startY);
          fire('touchend', endX, endY);
        }
        """,
        [start_x, start_y, end_x, end_y],
    )


def open_and_select_agenda(page, start_timer=False, minutes='1', skip_timer=False):
    page.goto(BASE_URL, wait_until='domcontentloaded')
    page.wait_for_load_state('networkidle')
    page.wait_for_selector('#fileSelectorModal.is-open')
    page.wait_for_selector('.file-button')
    page.locator('.file-button', has_text='agenda.json').click()
    page.wait_for_selector('#timerModal.is-open')
    if start_timer:
        page.fill('#sessionLength', minutes)
        page.locator('#timerForm button[type="submit"]').click()
    elif skip_timer:
        page.click('#skipTimer')
    else:
        page.click('#skipTimer')
    page.locator('#timerModal').wait_for(state='hidden')
    page.wait_for_timeout(300)


def collect_browser_results(playwright):
    browser = playwright.chromium.launch(headless=True)
    results = {
        'screenshots': [],
        'console_messages': [],
        'page_errors': [],
        'request_failures': [],
        'api_responses': [],
    }

    desktop = browser.new_context(viewport={'width': 1280, 'height': 900})
    page = desktop.new_page()
    page.on('console', lambda msg: results['console_messages'].append({'type': msg.type, 'text': msg.text}))
    page.on('pageerror', lambda exc: results['page_errors'].append(str(exc)))
    page.on('requestfailed', lambda req: results['request_failures'].append({'url': req.url, 'error': req.failure}))
    page.on('response', lambda response: results['api_responses'].append({'url': response.url, 'status': response.status}) if '/api/' in response.url else None)

    page.goto(BASE_URL, wait_until='domcontentloaded')
    page.wait_for_load_state('networkidle')
    results['screenshots'].append(record_page(page, 'startup-modal', 'startup-modal.png'))

    startup_modal = {
        'visible': page.locator('#fileSelectorModal').evaluate("el => el.classList.contains('is-open')"),
        'status_text': page.locator('#fileStatus').inner_text(),
        'files': page.locator('.file-button').all_inner_texts(),
        'layout': layout_metrics(page),
        'list_slides_payload': page.evaluate("""async () => await (await fetch('/api/list-slides')).json()"""),
    }
    results['startup_modal'] = startup_modal

    page.locator('.file-button', has_text='agenda.json').click()
    page.wait_for_selector('#timerModal.is-open')
    results['screenshots'].append(record_page(page, 'agenda-timer-modal', 'agenda-timer-modal.png'))
    results['agenda_before_timer'] = {
        'header': page.locator('.app-header h1').inner_text(),
        'deck_name': page.locator('#deckName').inner_text(),
        'slide_kicker': page.locator('#slideKicker').inner_text(),
        'slide_title': page.locator('#slideTitle').inner_text(),
        'paragraphs': page.locator('#slideContent p').all_inner_texts(),
        'bullets': page.locator('#slideContent li').all_inner_texts(),
        'timer_button_text': page.locator('#timerToggle').inner_text(),
        'layout': layout_metrics(page),
    }

    page.fill('#sessionLength', '1')
    page.locator('#timerForm button[type="submit"]').click()
    page.locator('#timerModal').wait_for(state='hidden')
    page.wait_for_timeout(2200)
    timer_snapshot_1 = {
        'elapsed': page.locator('#elapsedTime').inner_text(),
        'remaining': page.locator('#remainingTime').inner_text(),
        'mean': page.locator('#meanTime').inner_text(),
        'button': page.locator('#timerToggle').inner_text(),
    }
    page.wait_for_timeout(1200)
    timer_snapshot_2 = {
        'elapsed': page.locator('#elapsedTime').inner_text(),
        'remaining': page.locator('#remainingTime').inner_text(),
        'mean': page.locator('#meanTime').inner_text(),
        'button': page.locator('#timerToggle').inner_text(),
    }
    results['timer'] = {'after_2s': timer_snapshot_1, 'after_3s': timer_snapshot_2}
    results['screenshots'].append(record_page(page, 'agenda-running-timer', 'agenda-running-timer.png'))

    page.keyboard.press('ArrowRight')
    page.wait_for_timeout(300)
    after_right = {
        'kicker': page.locator('#slideKicker').inner_text(),
        'title': page.locator('#slideTitle').inner_text(),
    }
    page.keyboard.press('ArrowLeft')
    page.wait_for_timeout(300)
    after_left = {
        'kicker': page.locator('#slideKicker').inner_text(),
        'title': page.locator('#slideTitle').inner_text(),
    }
    dispatch_swipe(page, 1000, 450, 200, 450)
    page.wait_for_timeout(300)
    after_swipe_left = {
        'kicker': page.locator('#slideKicker').inner_text(),
        'title': page.locator('#slideTitle').inner_text(),
    }
    dispatch_swipe(page, 200, 450, 1000, 450)
    page.wait_for_timeout(300)
    after_swipe_right = {
        'kicker': page.locator('#slideKicker').inner_text(),
        'title': page.locator('#slideTitle').inner_text(),
    }
    timer_box = page.locator('.timer-row').bounding_box()
    results['navigation'] = {
        'after_arrow_right': after_right,
        'after_arrow_left': after_left,
        'after_swipe_left': after_swipe_left,
        'after_swipe_right': after_swipe_right,
        'timer_row_visible': timer_box is not None,
        'timer_row_box': timer_box,
    }

    small = browser.new_context(viewport={'width': 1024, 'height': 420})
    small_page = small.new_page()
    open_and_select_agenda(small_page, skip_timer=True)
    small_page.keyboard.press('ArrowRight')
    small_page.wait_for_timeout(200)
    scroll_data = small_page.evaluate(
        """
        () => {
          const card = document.getElementById('slideCard');
          const before = { scrollHeight: card.scrollHeight, clientHeight: card.clientHeight, maxScroll: card.scrollHeight - card.clientHeight };
          card.scrollTop = card.scrollHeight;
          const scrolled = card.scrollTop;
          return { before, scrolled };
        }
        """
    )
    small_page.keyboard.press('ArrowRight')
    small_page.wait_for_timeout(200)
    reset_scroll_top = small_page.evaluate("document.getElementById('slideCard').scrollTop")
    results['scrolling'] = {
        'metrics': scroll_data,
        'scroll_reset_after_navigation': reset_scroll_top,
        'slide_title_after_navigation': small_page.locator('#slideTitle').inner_text(),
    }

    error_context = browser.new_context(viewport={'width': 1280, 'height': 900})
    error_page = error_context.new_page()
    error_page.goto(BASE_URL, wait_until='domcontentloaded')
    error_page.wait_for_load_state('networkidle')
    error_page.wait_for_selector('#fileSelectorModal.is-open')
    error_page.evaluate("loadSlideFile('missing.json')")
    error_page.wait_for_timeout(800)
    results['invalid_slide_ui'] = {
        'file_status': error_page.locator('#fileStatus').inner_text(),
        'load_slide_type': error_page.evaluate("typeof loadSlideFile"),
    }

    ipad = browser.new_context(viewport={'width': 1024, 'height': 1366}, user_agent='Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1', has_touch=True)
    ipad_page = ipad.new_page()
    ipad_page.goto(BASE_URL, wait_until='domcontentloaded')
    ipad_page.wait_for_load_state('networkidle')
    results['screenshots'].append(record_page(ipad_page, 'ipad-startup-modal', 'ipad-startup-modal.png'))
    open_and_select_agenda(ipad_page, skip_timer=True)
    ipad_layout = layout_metrics(ipad_page)
    dispatch_swipe(ipad_page, 900, 700, 150, 700)
    ipad_page.wait_for_timeout(300)
    swipe_forward = ipad_page.locator('#slideKicker').inner_text()
    ipad_page.keyboard.press('ArrowLeft')
    ipad_page.wait_for_timeout(300)
    key_back = ipad_page.locator('#slideKicker').inner_text()
    results['screenshots'].append(record_page(ipad_page, 'ipad-agenda', 'ipad-agenda.png'))
    results['ipad'] = {
        'layout': ipad_layout,
        'deck_name': ipad_page.locator('#deckName').inner_text(),
        'slide_kicker': ipad_page.locator('#slideKicker').inner_text(),
        'slide_title': ipad_page.locator('#slideTitle').inner_text(),
        'nav_button_count': ipad_page.locator("button:has-text('Next'), button:has-text('Previous')").count(),
        'swipe_forward_result': swipe_forward,
        'keyboard_back_result': key_back,
    }

    ipad.close()
    error_context.close()
    small.close()
    desktop.close()
    browser.close()
    return results


def main():
    report = {
        'base_url': BASE_URL,
        'endpoint_checks': {
            'list_slides': read_url(f'{BASE_URL}/api/list-slides'),
            'agenda': read_url(f'{BASE_URL}/api/get-slide?filename=agenda.json'),
            'missing': read_url(f'{BASE_URL}/api/get-slide?filename=missing.json'),
        },
    }

    with sync_playwright() as playwright:
        report['browser_checks'] = collect_browser_results(playwright)

    out_path = OUT_DIR / 'live_app_report.json'
    out_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(out_path)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
