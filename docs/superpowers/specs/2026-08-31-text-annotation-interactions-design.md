# 已有文章画线交互设计

## 目标

补齐文章画线功能的前端管理闭环：用户点击已经画线的文字时，显示与点击位置关联的操作 Tooltip。管理员可以直接更换整条画线的颜色、线型或删除整条画线；游客不能管理画线，但在该段落还没有段评时，仍可以通过 Tooltip 添加段评。

本次只接通现有的 `PATCH` 和 `DELETE` API，不改数据库结构，也不处理数据库性能优化。

## 交互规则

| 当前用户 | 当前段落没有段评 | 当前段落已有段评 |
| --- | --- | --- |
| 游客 | 显示“添加段评” | 不显示 Tooltip |
| 管理员 | 显示“添加段评”、颜色、线型和删除 | 显示颜色、线型和删除 |

补充规则：

- 点击没有画线的普通文字，不显示已有画线 Tooltip。
- 用户拖动产生非折叠选区时，继续使用现有的选区 Tooltip，并关闭已有画线 Tooltip。
- 点击其他位置时关闭已有画线 Tooltip。
- 点击 Tooltip 本身不能触发底层文章点击，也不能清除当前交互状态。
- 点击“添加段评”时，使用整条画线的 `selectedText` 作为段评引用文字。
- 修改样式影响整条画线，不修改其范围和引用文字。
- 删除操作直接执行，不增加二次确认弹窗。

## 点击命中方案

继续使用现有 CSS Custom Highlight API 渲染画线，不把 MDX 文字改写成可点击的 `<span>`。

在文章区域监听点击事件：

1. 从点击目标向上寻找 `[data-paragraph-id]`，确定所属段落。
2. 如果浏览器当前存在非折叠文字选区，则忽略本次点击，让选区交互优先。
3. 使用 `document.caretPositionFromPoint(x, y)` 获取点击对应的文字节点和节点内偏移；不支持该 API 时使用 `document.caretRangeFromPoint(x, y)` 作为兼容方案。
4. 创建一个从段落开头到点击位置的临时 Range，通过 `range.toString().length` 换算为段落内绝对字符偏移。
5. 只在当前段落的 annotations 中寻找覆盖该偏移的候选画线。范围判断使用闭区间处理点击返回的字符边界；由于相接画线会在创建时合并，不会产生两个候选项。
6. 复用画线渲染时的 Range 创建逻辑，并确认点击坐标位于候选画线的某个 `getClientRects()` 矩形中，避免把画线旁边的未画线字符误判为命中。
7. 命中后保存画线数据和 Tooltip 视口坐标；没有命中则关闭 Tooltip。

画线范围不允许重叠或相接，因此一个点击位置最多命中一条画线。字符边界处需要同时兼容浏览器返回字符左边界或右边界的情况，但最终仍以当前段落的一条画线为唯一结果。

把现有 `useTextAnnotationHighlights` 内创建 DOM Range 的逻辑抽到共享工具中。新增纯函数 `findTextAnnotationAtOffset` 负责按段落和偏移筛选候选画线，新增 `useActiveTextAnnotation` Hook 负责监听点击、执行坐标换算、Range 矩形确认以及管理激活状态。`CommentableParagraph` 不直接实现 DOM 命中算法。

## 前端模块职责

### API 层

在 `components/Comments/Article/api/textAnnotationsApi.ts` 增加：

- `updateTextAnnotation(postSlug, annotationId, input)`：发送 `PATCH`，只提交 `lineStyle` 和 `color`，返回服务器更新后的完整 annotation。
- `deleteTextAnnotation(postSlug, annotationId)`：发送 `DELETE`。

URL 中的 `postSlug` 和 `annotationId` 都使用 `encodeURIComponent`。非 2xx 响应继续读取服务端 `message` 并抛出 `Error`。

同时在共享类型中增加仅包含 `lineStyle` 和 `color` 的更新输入类型，以及包含完整 `annotation` 和可选 `message` 的更新响应类型。

### 状态 Hook

扩展 `useTextAnnotations`，对外提供：

- `annotations`
- `addTextAnnotation`
- `updateTextAnnotation`
- `deleteTextAnnotation`

更新成功后，用服务器返回的 annotation 替换相同 ID 的本地项；删除成功后过滤掉相同 ID 的本地项。两个操作都复用现有 `replaceAnnotations`，保持 React state 与 `annotationsRef` 同步，不重新请求整篇文章画线。

请求失败时不提前修改本地数据，从而不需要回滚。

### 点击状态

Provider 调用 `useActiveTextAnnotation(annotations)` 管理“当前激活画线”状态，内容包括：

- 命中的完整 `TextAnnotation`
- Tooltip 的 `x`、`y` 和 `placement`

点击命中、点击空白关闭、选区产生时关闭等行为由该 Hook 集中管理。Provider 将激活状态、关闭方法和画线修改方法通过 Context 提供给对应段落。

### Tooltip

新增 `ExistingTextAnnotationTooltip`。把颜色列表、线型列表和管理按钮抽成 `TextAnnotationControls`，供现有 `SelectionCommentTooltip` 和新 Tooltip 复用，避免两处配置逐渐不一致。

已有画线 Tooltip 根据权限和 `commentCount` 决定显示内容：

- `commentCount === 0` 时显示“添加段评”。
- `canManageTextAnnotations === true` 时显示颜色、线型和删除。
- 两个条件都不满足时不渲染 Tooltip。

当前颜色和线型需要显示选中状态。选择新颜色时，使用当前线型发送 PATCH；选择新线型时，使用当前颜色发送 PATCH。选择与当前值相同的选项不发送请求。

请求进行中禁用画线管理按钮，防止重复 PATCH 或 DELETE。PATCH 成功后 Tooltip 保持打开并展示新状态；DELETE 成功后关闭 Tooltip。

## 数据流

### 修改画线

```text
点击已有画线
  -> 计算段落字符偏移并命中 annotation
  -> 显示 Tooltip
  -> 管理员选择颜色或线型
  -> PATCH /api/posts/:slug/text-annotations/:annotationId
  -> 用服务端 annotation 替换本地同 ID 数据
  -> CSS Highlight 根据新 annotations 重绘
```

### 删除画线

```text
点击已有画线
  -> 点击删除
  -> DELETE /api/posts/:slug/text-annotations/:annotationId
  -> 从本地 annotations 移除该 ID
  -> 关闭 Tooltip
  -> CSS Highlight 清除对应画线
```

### 从已有画线添加段评

```text
点击已有画线且该段没有段评
  -> 点击添加段评
  -> 使用 annotation.selectedText 打开现有 CommentComposerDialog
  -> 发布后刷新段评数量并打开段评抽屉
```

## 权限与安全

前端的 `canManageTextAnnotations` 只负责隐藏管理入口，不能替代权限校验。现有 PATCH 和 DELETE Route 继续通过服务端 session 判断管理员身份。

游客可以读取并看到公开画线，也可以按现有段评规则添加段评，但不能调用画线修改和删除功能。即使游客绕过 UI 手动请求，服务端也应返回 401。

## 错误处理

- 点击位置无法换算、段落不存在或没有命中 annotation：安静关闭 Tooltip，不显示错误。
- PATCH 失败：保留旧画线和 Tooltip，使用 toast 显示服务端错误消息。
- DELETE 失败：保留画线和 Tooltip，使用 toast 显示服务端错误消息。
- 添加段评沿用现有评论弹窗和错误处理。
- 浏览器不支持两种 caret 坐标 API 时，不启用点击画线操作，但不影响画线显示和文字选区功能。

## 测试范围

### API 单元测试

在 `textAnnotationsApi.test.ts` 覆盖：

- PATCH 的 URL、method、header 和 body。
- PATCH 成功时返回更新后的 annotation。
- PATCH 失败时抛出服务端消息。
- DELETE 的 URL 和 method。
- DELETE 失败时抛出服务端消息。

### 点击匹配单元测试

将“根据段落 ID 和字符偏移寻找 annotation”的部分保留为纯函数并测试：

- 偏移在画线范围内时命中。
- 偏移不在任何画线内时返回 null。
- 不匹配其他段落的画线。
- 字符边界不会错误命中另一条画线。

### 状态与交互验证

- PATCH 成功后只替换对应 ID，其他画线保持不变。
- DELETE 成功后只删除对应 ID。
- 无段评时游客和管理员都能看到添加段评按钮。
- 有段评时游客看不到空 Tooltip，管理员仍能管理画线。
- 新文字选区出现时，已有画线 Tooltip 关闭。
- 选区 Tooltip 的新增画线行为保持不变。

最后运行 Vitest、TypeScript 和范围内 ESLint，并在浏览器中分别以游客和管理员身份验证点击、修改、删除及段评入口。

## 不在本次范围内

- 数据库查询性能与缓存优化。
- 乐观更新和失败回滚。
- 删除确认弹窗或撤销删除。
- 多人实时同步。
- 移动端长按手势的专项交互优化。
