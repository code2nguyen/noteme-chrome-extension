export const devData = {
  _ART_BOARD__ART_BOARD_ITEM_IDS__defaultArtBoard: [
    'e360be8d-1d59-4da6-97c8-7b14691aa981',
    '55ff2349-02c8-44c0-b16a-906fc7989f7c',
  ],
  _ART_BOARD_ITEM__IDS: ['e360be8d-1d59-4da6-97c8-7b14691aa981', '55ff2349-02c8-44c0-b16a-906fc7989f7c'],
  'ART_BOARD_ITEM__e360be8d-1d59-4da6-97c8-7b14691aa981': {
    boardId: 'defaultArtBoard',
    id: 'e360be8d-1d59-4da6-97c8-7b14691aa981',
    layout: { top: 161, left: 144, width: 519, height: 497 },
    element: 'ntm-text-note-element',
    properties: { color: '#1e3a5f', language: 'markdown' },
    modifiedDate: '2019-11-20T09:51:23.523Z',
  },
  'ITEM_DATA__e360be8d-1d59-4da6-97c8-7b14691aa981': {
    id: 'e360be8d-1d59-4da6-97c8-7b14691aa981',
    data: {
      ops: [
        {
          insert:
            'Loem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula eu tempor congue, eros est euismod turpis, id tincidunt sapien risus a quam. Maecenas fermentum consequat mi. Donec fermentum. Pellentesque malesuada nulla a mi. Duis sapien sem, aliquet nec, commodo eget, consequat quis, neque. Aliquam faucibus, elit ut dictum aliquet, felis nisl adipiscing sapien, sed malesuada diam lacus eget erat. Cras mollis scelerisque nunc. Nullam arcu. Aliquam consequat. Curabitur augue lorem, dapibus quis, laoreet et, pretium ac, nisi. Aenean magna nisl, mollis quis, molestie eu, feugiat in, orci. In hac habitasse platea dictumst.',
        },
        { insert: '/n' },
      ],
    },
    createdDate: '2019-11-20T09:51:23.563Z',
    modifiedDate: '2019-11-20T09:51:26.513Z',
    empty: false,
    dataType: 'delta',
  },
  'ART_BOARD_ITEM__55ff2349-02c8-44c0-b16a-906fc7989f7c': {
    boardId: 'defaultArtBoard',
    id: '55ff2349-02c8-44c0-b16a-906fc7989f7c',
    layout: { top: 231, left: 1584, width: 394, height: 440 },
    element: 'ntm-code-note-element',
    properties: { color: '#282C34', language: 'javascript' },
    modifiedDate: '2019-11-20T09:52:22.356Z',
  },
  'ITEM_DATA__55ff2349-02c8-44c0-b16a-906fc7989f7c': {
    id: '55ff2349-02c8-44c0-b16a-906fc7989f7c',
    data:
      "@Component({ selector: 'ntm-main-board', templateUrl: './main-board.component.html', styleUrls: ['./main-board.component.scss'], encapsulation: ViewEncapsulation.None, changeDetection: ChangeDetectionStrategy.OnPush, host: { class: 'main-board' } }) export class MainBoardComponent implements OnInit, OnDestroy { displayBoard: Board = { id: 'defaultArtBoard', name: 'Default', type: 'ArtBoard' }; displayBoardItems: ArtBoardItem[] = []; private destroyed$ = new Subject<void>(); constructor( private store: Store<AppState>, private cd: ChangeDetectorRef, private _ngZone: NgZone, private dialog: MatDialog ) {} ngOnInit() { this.store.dispatch(ArtBoardItemActions.loadArtBoardItems({ boardId: this.displayBoard.id })); this.store .pipe(select(selectArtBoardItemByBoardId, { boardId: this.displayBoard.id }), takeUntil(this.destroyed$)) .subscribe(artBoardItems => { this._ngZone.run(() => { this.displayBoardItems = artBoardItems; this.cd.markForCheck(); }); }); window.hljs.configure({ languages: ['javascript', 'css', 'json', 'bash'] }); } ngOnDestroy() { this.destroyed$.next(); this.destroyed$.complete(); } openSearchPanel() { this.dialog.open(SearchPanelComponent, { width: '50vw', minWidth: '480px', maxHeight: '70vh', position: { top: '20vh' } }); } };",
    createdDate: '2019-11-20T09:52:22.384Z',
    modifiedDate: '2019-11-20T09:52:28.562Z',
    empty: false,
    dataType: 'text',
  },
};
